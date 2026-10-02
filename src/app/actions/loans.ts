"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { creditProfiles, loanProducts, users } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { can, fullName, requireCustomer, requirePermission, requireStaff } from "@/lib/auth";
import { formatNaira } from "@/lib/format";
import { toKobo } from "@/lib/loans/math";
import { startRepayment } from "@/lib/loans/repay";
import { applyForLoan, approveLoan, cancelLoan, disburseLoan, markDefaulted, recordManualPayment, reviewLoan, type Outcome } from "@/lib/loans/service";
import type { FormState } from "./auth";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
/** "250,000" or "250000.50" (naira) → kobo; NaN if not a number. */
const nairaToKobo = (v: string) => {
  const n = Number(v.replace(/[₦,\s]/g, ""));
  return Number.isFinite(n) ? toKobo(n) : NaN;
};
const STATEMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];

function result(outcome: Outcome, paths: string[], fields?: Record<string, string>): FormState {
  if (!outcome.ok) return { error: outcome.error, fields };
  paths.forEach((p) => revalidatePath(p, "layout"));
  return { notice: outcome.message };
}

/* ---------- Customer ---------- */

export async function applyLoan(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireCustomer();
  const fields = Object.fromEntries(["productId", "amount", "tenor", "purpose", "monthlyIncome", "employmentType", "employer", "payoutBank", "payoutAccount", "payoutName"].map((k) => [k, str(fd, k)]));

  let statement = null;
  const file = fd.get("statement");
  if (file instanceof File && file.size > 0) {
    if (!STATEMENT_TYPES.includes(file.type)) return { error: "Upload your statement as a PDF, JPG or PNG.", fields };
    if (file.size > 3 * 1024 * 1024) return { error: "That statement is too large (max 3 MB).", fields };
    statement = { fileName: file.name.slice(0, 120), mimeType: file.type, data: Buffer.from(await file.arrayBuffer()).toString("base64"), size: file.size };
  }

  const outcome = await applyForLoan(user, {
    productId: Number(fields.productId), amount: nairaToKobo(fields.amount), tenor: Number(fields.tenor), purpose: fields.purpose,
    monthlyIncome: nairaToKobo(fields.monthlyIncome), employmentType: fields.employmentType, employer: fields.employer,
    payoutBank: fields.payoutBank, payoutAccount: fields.payoutAccount, payoutName: fields.payoutName,
    acceptTerms: fd.get("acceptTerms") === "on", pin: str(fd, "pin"), statement,
  });
  if (!outcome.ok) return { error: outcome.error, fields };
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/loans?applied=${outcome.loanId}`);
}

export async function cancelApplication(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireCustomer();
  return result(await cancelLoan(user, Number(fd.get("loanId"))), ["/dashboard"]);
}

export async function repayLoan(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireCustomer();
  const amount = fd.get("choice") === "custom" ? nairaToKobo(str(fd, "custom")) : Number(fd.get("choice"));
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter how much you want to pay." };
  const started = await startRepayment(user, Number(fd.get("loanId")), Math.round(amount));
  if (!started.ok) return { error: started.error };
  revalidatePath("/dashboard", "layout");
  redirect(started.redirectTo);
}

/* ---------- Staff ---------- */

const staffPaths = (id: number) => [`/console/loans/${id}`, "/console"];

export async function reviewLoanAction(loanId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await requirePermission("loans.review");
  return result(await reviewLoan(staff, loanId, fd.get("decision") === "approve" ? "approve" : "decline", str(fd, "note")), staffPaths(loanId));
}

export async function approveLoanAction(loanId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await requirePermission("loans.approve");
  return result(await approveLoan(staff, loanId, fd.get("decision") === "approve" ? "approve" : "decline", str(fd, "note")), staffPaths(loanId));
}

export async function disburseLoanAction(loanId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await requirePermission("loans.approve");
  return result(await disburseLoan(staff, loanId, str(fd, "reference")), staffPaths(loanId));
}

export async function recordPaymentAction(loanId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await requirePermission("loans.collect");
  return result(await recordManualPayment(staff, loanId, nairaToKobo(str(fd, "amount")), str(fd, "note")), staffPaths(loanId));
}

export async function markDefaultedAction(loanId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await requirePermission("loans.approve");
  return result(await markDefaulted(staff, loanId, str(fd, "note")), staffPaths(loanId));
}

export async function setLimitOverride(userId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await requireStaff();
  if (!can(staff, "loans.approve")) return { error: "Only staff who approve loans can change limits." };
  const raw = str(fd, "limit");
  const value = raw === "" ? null : nairaToKobo(raw);
  if (value !== null && (!Number.isFinite(value) || value < 0)) return { error: "Enter a limit in naira, or leave it empty to use the calculated limit." };
  const db = await getDb();
  const [customer] = await db.select().from(users).where(eq(users.id, userId));
  if (!customer) return { error: "Customer not found." };
  await db.insert(creditProfiles).values({ userId, limitOverride: value }).onConflictDoUpdate({ target: creditProfiles.userId, set: { limitOverride: value, updatedAt: new Date() } });
  await logAudit({ actorId: staff.id, action: "credit.limit_override", summary: value === null ? `removed the limit override for ${fullName(customer)}` : `set ${fullName(customer)}'s loan limit to ${formatNaira(value / 100)}`, target: { type: "user", id: userId } });
  revalidatePath("/console", "layout");
  return { notice: value === null ? "Using the calculated limit again." : "Limit updated." };
}

/* ---------- Loan products ---------- */

export async function saveLoanProduct(_: FormState, fd: FormData): Promise<FormState> {
  const staff = await requirePermission("investments.manage");
  const id = Number(fd.get("id")) || null;
  const pct = (k: string) => Math.round(Number(str(fd, k)) * 100);
  const tenors = str(fd, "tenors").split(/[,\s]+/).map(Number).filter((n) => Number.isInteger(n) && n > 0 && n <= 36);
  const optionalKobo = (k: string) => (str(fd, k) === "" ? null : nairaToKobo(str(fd, k)));
  const values = {
    name: str(fd, "name"),
    description: str(fd, "description"),
    minAmount: nairaToKobo(str(fd, "minAmount")),
    maxAmount: nairaToKobo(str(fd, "maxAmount")),
    tenors: Array.from(new Set(tenors)).sort((a, b) => a - b),
    monthlyRateBps: pct("monthlyRate"),
    interestMethod: str(fd, "interestMethod") === "flat" ? ("flat" as const) : ("reducing" as const),
    processingFeeBps: pct("processingFee"),
    lateFeeBps: pct("lateFee"),
    minKycTier: Math.min(3, Math.max(1, Number(str(fd, "minKycTier")) || 1)),
    statementAbove: optionalKobo("statementAbove"),
    autoApproveUpTo: optionalKobo("autoApproveUpTo"),
    active: fd.get("active") === "on",
  };
  const fields = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)]));
  if (values.name.length < 3) return { error: "Give the product a name.", fields };
  if (!(values.minAmount > 0) || !(values.maxAmount >= values.minAmount)) return { error: "Check the minimum and maximum amounts.", fields };
  if (!values.tenors.length) return { error: "List at least one repayment period in months, e.g. 1, 2, 3.", fields };
  if (!(values.monthlyRateBps >= 0 && values.monthlyRateBps <= 1000)) return { error: "Monthly interest must be between 0% and 10%.", fields };
  if ([values.processingFeeBps, values.lateFeeBps].some((v) => !(v >= 0 && v <= 1000))) return { error: "Fees must be between 0% and 10%.", fields };

  const db = await getDb();
  if (id) await db.update(loanProducts).set(values).where(eq(loanProducts.id, id));
  else await db.insert(loanProducts).values(values);
  await logAudit({ actorId: staff.id, action: id ? "product.updated" : "product.created", summary: `${id ? "updated" : "created"} loan product ${values.name} (${values.monthlyRateBps / 100}% monthly, ${values.active ? "active" : "inactive"})`, target: { type: "loan_product", id: id ?? values.name }, details: values });
  revalidatePath("/console/products");
  return { notice: id ? "Product saved. Existing loans keep their original terms." : "Product created." };
}
