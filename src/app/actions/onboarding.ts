"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { kycProfiles } from "@/db/schema";
import { can, fullName, requireStaff, type CurrentUser } from "@/lib/auth";
import { addressDocumentFrom, statementFrom } from "@/lib/form-files";
import { tierNames } from "@/lib/kyc";
import { submitAddress, submitNinSelfie, submitTier1, type KycOutcome } from "@/lib/kyc/service";
import { toKobo } from "@/lib/loans/math";
import { applyForLoan, withdrawPreparedLoan } from "@/lib/loans/service";
import { assignOfficer, createCustomer, officerCustomer, sendSetupLink } from "@/lib/onboarding";
import { lookupAccount } from "@/lib/payments/banks";
import { blockedFor, recordFailure } from "@/lib/rate-limit";
import type { FormState } from "./auth";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const nairaToKobo = (v: string) => {
  const n = Number(v.replace(/[₦,\s]/g, ""));
  return Number.isFinite(n) ? toKobo(n) : NaN;
};
const page = (id: number) => `/console/my-customers/${id}`;

/** Credit officers, or customer managers working on someone else's customer. */
async function officer(): Promise<CurrentUser> {
  const staff = await requireStaff();
  if (!can(staff, "console.access") || !(can(staff, "customers.onboard") || can(staff, "users.manage"))) redirect("/console?denied=1");
  return staff;
}

async function customerFor(staff: CurrentUser, customerId: number) {
  const customer = await officerCustomer(staff, customerId);
  if (!customer) redirect("/console/my-customers?missing=1");
  return customer;
}

function refreshed(customerId: number) {
  revalidatePath(page(customerId));
  revalidatePath("/console/my-customers");
}

/* ---------- Account ---------- */

export async function addCustomer(_: FormState, fd: FormData): Promise<FormState> {
  const staff = await officer();
  const fields = { firstName: str(fd, "firstName"), lastName: str(fd, "lastName"), phone: str(fd, "phone"), email: str(fd, "email") };
  const r = await createCustomer(staff, { ...fields, consent: fd.get("consent") === "on" });
  if (!r.ok) return { error: r.error, fields };
  revalidatePath("/console/my-customers");
  redirect(`${page(r.id)}?notice=${encodeURIComponent(r.message)}`);
}

export async function resendSetupLink(customerId: number): Promise<FormState> {
  const staff = await officer();
  const r = await sendSetupLink(staff, await customerFor(staff, customerId));
  refreshed(customerId);
  return r.ok ? { notice: r.message } : { error: r.error };
}

export async function assignOfficerAction(customerId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await requireStaff();
  const r = await assignOfficer(staff, customerId, Number(fd.get("officerId")) || null);
  revalidatePath(`/console/customers/${customerId}`);
  return r.ok ? { notice: r.message } : { error: r.error };
}

/* ---------- Identity checks on the customer's behalf ---------- */

async function kycDone(customer: CurrentUser, outcome: KycOutcome, tier: number, fields?: Record<string, string>): Promise<FormState> {
  if (!outcome.ok) return { error: outcome.error, fields };
  refreshed(customer.id);
  if (outcome.status === "approved") return { notice: `Verified. ${customer.firstName} is now on ${(await tierNames())[tier]}.` };
  return { notice: "Sent to our KYC team to check. You'll see the result here within one working day." };
}

export async function officerTier1(customerId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await officer();
  const customer = await customerFor(staff, customerId);
  const fields = { idKind: str(fd, "idKind"), idNumber: str(fd, "idNumber"), dateOfBirth: str(fd, "dateOfBirth") };
  return kycDone(customer, await submitTier1(customer, { ...fields, consent: fd.get("consent") === "on" }, staff), 1, fields);
}

export async function officerSelfie(customerId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await officer();
  const customer = await customerFor(staff, customerId);
  const fields = { nin: str(fd, "nin") };
  return kycDone(customer, await submitNinSelfie(customer, { nin: fields.nin, selfie: str(fd, "selfie") }, staff), 2, fields);
}

export async function officerAddress(customerId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await officer();
  const customer = await customerFor(staff, customerId);
  const fields = { addressLine: str(fd, "addressLine"), city: str(fd, "city"), state: str(fd, "state") };
  const document = await addressDocumentFrom(fd.get("document"));
  if (typeof document !== "string") return { ...document, fields };
  return kycDone(customer, await submitAddress(customer, { ...fields, document }, staff), 3, fields);
}

/* ---------- Loans ---------- */

export async function prepareLoan(customerId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await officer();
  const customer = await customerFor(staff, customerId);
  const fields = Object.fromEntries(["productId", "amount", "tenor", "purpose", "monthlyIncome", "employmentType", "employer", "payoutBankCode", "payoutAccount"].map((k) => [k, str(fd, k)]));
  const statement = await statementFrom(fd.get("statement"));
  if (statement && "error" in statement) return { error: statement.error, fields };
  const outcome = await applyForLoan(customer, {
    productId: Number(fields.productId), amount: nairaToKobo(fields.amount), tenor: Number(fields.tenor), purpose: fields.purpose,
    monthlyIncome: nairaToKobo(fields.monthlyIncome), employmentType: fields.employmentType, employer: fields.employer,
    payoutBankCode: fields.payoutBankCode, payoutAccount: fields.payoutAccount, acceptTerms: false, pin: "", statement,
  }, staff);
  if (!outcome.ok) return { error: outcome.error, fields };
  refreshed(customerId);
  redirect(`${page(customerId)}?notice=${encodeURIComponent(outcome.message)}`);
}

export async function withdrawLoan(customerId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await officer();
  await customerFor(staff, customerId);
  const r = await withdrawPreparedLoan(staff, Number(fd.get("loanId")));
  refreshed(customerId);
  return r.ok ? { notice: r.message } : { error: r.error };
}

/** Name enquiry while the officer types the customer's account number. The application re-checks it on submit. */
export async function officerLookupPayout(customerId: number, bankCode: string, accountNumber: string): Promise<{ ok: true; accountName: string } | { ok: false; error: string }> {
  const staff = await officer();
  const customer = await customerFor(staff, customerId);
  const wait = await blockedFor(String(staff.id), "account_lookup");
  if (wait) return { ok: false, error: `Too many lookups. Try again in ${wait} minute${wait === 1 ? "" : "s"}.` };
  const [kyc] = await (await getDb()).select({ first: kycProfiles.legalFirstName, last: kycProfiles.legalLastName }).from(kycProfiles).where(eq(kycProfiles.userId, customer.id));
  const found = await lookupAccount(bankCode, accountNumber, kyc?.first ? `${kyc.first} ${kyc.last}` : fullName(customer));
  if (!found.ok) await recordFailure(String(staff.id), "account_lookup");
  return found.ok ? { ok: true, accountName: found.accountName } : { ok: false, error: found.error };
}
