import "server-only";
import { and, desc, eq, inArray, notInArray, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import { auditLogs, creditProfiles, customerContacts, kycProfiles, loanProducts, loans, paymentPromises, users, type ContactChannel, type ContactOutcome, type UserStatus } from "@/db/schema";
import { logAudit } from "./audit";
import { can, fullName, loadUser, type CurrentUser } from "./auth";
import { notifyCustomer } from "./notifications";

export type Result = { ok: true; message: string } | { ok: false; error: string };
const author = alias(users, "author");

export async function customerProfile(id: number) {
  const user = await loadUser(id);
  if (!user || user.role.kind !== "customer") return null;
  const db = await getDb();
  const [kyc] = await db.select().from(kycProfiles).where(eq(kycProfiles.userId, id));
  const [credit] = await db.select().from(creditProfiles).where(eq(creditProfiles.userId, id));
  const customerLoans = await db.select({ loan: loans, productName: loanProducts.name }).from(loans).innerJoin(loanProducts, eq(loanProducts.id, loans.productId)).where(eq(loans.userId, id)).orderBy(desc(loans.createdAt));
  const contacts = await db.select({ c: customerContacts, authorFirst: author.firstName, authorLast: author.lastName, loanRef: loans.reference })
    .from(customerContacts).leftJoin(author, eq(author.id, customerContacts.authorId)).leftJoin(loans, eq(loans.id, customerContacts.loanId))
    .where(eq(customerContacts.customerId, id)).orderBy(desc(customerContacts.createdAt)).limit(50);
  const loanIds = customerLoans.map((l) => String(l.loan.id));
  const activity = await db.select({ a: auditLogs, actorFirst: author.firstName, actorLast: author.lastName }).from(auditLogs).leftJoin(author, eq(author.id, auditLogs.actorId))
    // Views are in the audit log but would drown out real activity here.
    .where(and(notInArray(auditLogs.action, ["customer.viewed", "kyc.viewed", "loan.document_viewed"]), or(and(eq(auditLogs.targetType, "user"), eq(auditLogs.targetId, String(id))), loanIds.length ? and(eq(auditLogs.targetType, "loan"), inArray(auditLogs.targetId, loanIds)) : undefined)))
    .orderBy(desc(auditLogs.createdAt)).limit(30);
  const promises = loanIds.length ? await db.select().from(paymentPromises).where(inArray(paymentPromises.loanId, customerLoans.map((l) => l.loan.id))).orderBy(desc(paymentPromises.createdAt)) : [];
  return { user, kyc: kyc ?? null, credit: credit ?? null, loans: customerLoans, contacts, activity, promises };
}

const STATUS_COPY: Record<Exclude<UserStatus, "pending">, { verb: string; tell: string | null }> = {
  active: { verb: "reactivated", tell: "Your DigitMonie account is fully active again." },
  restricted: { verb: "restricted", tell: "Some features on your DigitMonie account are paused while we review it. You can still sign in and repay loans." },
  frozen: { verb: "froze", tell: "Your DigitMonie account has been frozen. You can still repay loans. Contact support to find out more." },
  closed: { verb: "closed", tell: null },
};

/** Restricted and frozen customers can sign in and repay but not borrow; closed accounts can't sign in. */
export async function setCustomerStatus(staff: CurrentUser, customerId: number, status: Exclude<UserStatus, "pending">, reason: string): Promise<Result> {
  if (!can(staff, "users.manage")) return { ok: false, error: "You can't change customer accounts." };
  if (reason.trim().length < 5) return { ok: false, error: "Record a reason (it stays on the customer's file)." };
  const customer = await loadUser(customerId);
  if (!customer || customer.role.kind !== "customer") return { ok: false, error: "Customer not found." };
  if (customer.status === status) return { ok: false, error: `The account is already ${status}.` };
  if (status === "closed") {
    const [open] = await (await getDb()).select({ id: loans.id }).from(loans).where(and(eq(loans.userId, customerId), inArray(loans.status, ["pending", "reviewed", "approved", "active", "defaulted"])));
    if (open) return { ok: false, error: "This customer still has an open or unpaid loan. Freeze the account instead." };
  }
  await (await getDb()).update(users).set({
    status, statusReason: status === "active" ? null : reason.trim(), statusChangedAt: new Date(),
    ...(status === "closed" ? { sessionVersion: customer.sessionVersion + 1 } : {}),
  }).where(eq(users.id, customerId));
  await logAudit({ actorId: staff.id, action: `customer.${status}`, summary: `${STATUS_COPY[status].verb} ${fullName(customer)}'s account: ${reason.trim()}`, target: { type: "user", id: customerId } });
  const tell = STATUS_COPY[status].tell;
  if (tell) await notifyCustomer(customerId, { category: "account", title: status === "active" ? "Account active" : "Account update", body: tell, sms: tell, email: true });
  return { ok: true, message: `Account ${status}.` };
}

export async function unlockPin(staff: CurrentUser, customerId: number): Promise<Result> {
  if (!can(staff, "users.manage")) return { ok: false, error: "You can't change customer accounts." };
  const customer = await loadUser(customerId);
  if (!customer) return { ok: false, error: "Customer not found." };
  await (await getDb()).update(users).set({ pinAttempts: 0, pinLockedUntil: null }).where(eq(users.id, customerId));
  await logAudit({ actorId: staff.id, action: "customer.pin_unlocked", summary: `unlocked ${fullName(customer)}'s transaction PIN`, target: { type: "user", id: customerId } });
  return { ok: true, message: "PIN unlocked." };
}

export async function forceSignOut(staff: CurrentUser, customerId: number): Promise<Result> {
  if (!can(staff, "users.manage")) return { ok: false, error: "You can't change customer accounts." };
  const customer = await loadUser(customerId);
  if (!customer) return { ok: false, error: "Customer not found." };
  await (await getDb()).update(users).set({ sessionVersion: customer.sessionVersion + 1 }).where(eq(users.id, customerId));
  await logAudit({ actorId: staff.id, action: "customer.signed_out", summary: `signed ${fullName(customer)} out of all devices`, target: { type: "user", id: customerId } });
  return { ok: true, message: "Signed out everywhere." };
}

export const CHANNELS: { value: ContactChannel; label: string }[] = [
  { value: "call", label: "Phone call" }, { value: "sms", label: "SMS" }, { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" }, { value: "visit", label: "Visit" }, { value: "note", label: "Internal note" },
];
export const OUTCOMES: { value: ContactOutcome; label: string }[] = [
  { value: "reached", label: "Spoke to the customer" }, { value: "no_answer", label: "No answer" }, { value: "promised", label: "Promised to pay" },
  { value: "disputed", label: "Disputes the debt" }, { value: "wrong_number", label: "Wrong number" }, { value: "other", label: "Other" },
];

/** Adds to the contact log. Anyone who can see customers can add a note; collection contacts need the collections permission. */
export async function logContact(staff: CurrentUser, input: { customerId: number; loanId: number | null; channel: string; outcome: string; note: string }): Promise<Result> {
  if (!can(staff, "users.view")) return { ok: false, error: "You can't add to customer files." };
  const channel = CHANNELS.find((c) => c.value === input.channel)?.value;
  if (!channel) return { ok: false, error: "Choose how you contacted them." };
  if (channel !== "note" && !can(staff, "loans.collect") && !can(staff, "users.manage")) return { ok: false, error: "Only collections or customer-management staff log contacts. Add a note instead." };
  const outcome = channel === "note" ? null : OUTCOMES.find((o) => o.value === input.outcome)?.value ?? null;
  if (channel !== "note" && !outcome) return { ok: false, error: "Choose the outcome." };
  if (input.note.trim().length < 3) return { ok: false, error: "Write a short note." };
  await (await getDb()).insert(customerContacts).values({ customerId: input.customerId, loanId: input.loanId, authorId: staff.id, channel, outcome, note: input.note.trim().slice(0, 1000) });
  return { ok: true, message: "Added to the contact log." };
}
