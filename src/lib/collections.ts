import "server-only";
import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import { customerContacts, loanInstalments, loanPayments, loans, paymentPromises, roles, users, type Loan } from "@/db/schema";
import { logAudit } from "./audit";
import { can, type CurrentUser } from "./auth";
import { postJournal } from "./ledger";
import { naira, notify, report } from "./loans/common";
import { addMonths, todayIso } from "./loans/math";
import { notifyStaff } from "./notifications";
import { ADMIN_ROLE } from "./permissions";

export type Result = { ok: true; message: string } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });

export const BUCKETS = [
  { key: "1-7", label: "1–7 days", min: 1, max: 7 },
  { key: "8-30", label: "8–30 days", min: 8, max: 30 },
  { key: "31-60", label: "31–60 days", min: 31, max: 60 },
  { key: "61-90", label: "61–90 days", min: 61, max: 90 },
  { key: "90+", label: "Over 90 days", min: 91, max: Infinity },
] as const;

export const daysBetween = (fromIso: string, toIso: string) => Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);

const collector = alias(users, "collector");

/** Loans with something overdue, worst first, with who's chasing them and what was last said. */
export async function collectionsWorklist(opts: { bucket?: string; collectorId?: number } = {}) {
  const db = await getDb();
  const today = todayIso();
  const overdue = await db.select({
    loanId: loanInstalments.loanId,
    oldest: sql<string>`min(${loanInstalments.dueDate})`,
    owed: sql<number>`sum(${loanInstalments.principal} + ${loanInstalments.interest} + ${loanInstalments.lateFee} - ${loanInstalments.paid})`,
  }).from(loanInstalments).where(eq(loanInstalments.status, "overdue")).groupBy(loanInstalments.loanId);
  if (!overdue.length) return [];
  const ids = overdue.map((o) => o.loanId);

  const rows = await db.select({ loan: loans, firstName: users.firstName, lastName: users.lastName, phone: users.phone, customerId: users.id, collectorFirst: collector.firstName, collectorLast: collector.lastName })
    .from(loans).innerJoin(users, eq(users.id, loans.userId)).leftJoin(collector, eq(collector.id, loans.collectorId))
    .where(and(inArray(loans.id, ids), inArray(loans.status, ["active", "defaulted"])));
  const outstanding = await db.select({ loanId: loanInstalments.loanId, total: sql<number>`sum(${loanInstalments.principal} + ${loanInstalments.interest} + ${loanInstalments.lateFee} - ${loanInstalments.paid})` })
    .from(loanInstalments).where(inArray(loanInstalments.loanId, ids)).groupBy(loanInstalments.loanId);
  const lastContacts = await db.select({ loanId: customerContacts.loanId, at: sql<string>`max(${customerContacts.createdAt})` }).from(customerContacts).where(inArray(customerContacts.loanId, ids)).groupBy(customerContacts.loanId);
  const promises = await db.select().from(paymentPromises).where(and(inArray(paymentPromises.loanId, ids), eq(paymentPromises.status, "open")));

  const list = rows.map((r) => {
    const o = overdue.find((x) => x.loanId === r.loan.id)!;
    const dpd = daysBetween(o.oldest, today);
    return {
      ...r,
      dpd,
      bucket: BUCKETS.find((b) => dpd >= b.min && dpd <= b.max)?.key ?? "1-7",
      overdueAmount: Number(o.owed),
      outstanding: Number(outstanding.find((x) => x.loanId === r.loan.id)?.total ?? 0),
      lastContactAt: lastContacts.find((c) => c.loanId === r.loan.id)?.at ?? null,
      promise: promises.find((p) => p.loanId === r.loan.id) ?? null,
    };
  });
  return list
    .filter((r) => (!opts.bucket || r.bucket === opts.bucket) && (!opts.collectorId || r.loan.collectorId === opts.collectorId))
    .sort((a, b) => b.dpd - a.dpd);
}

/** Staff who can be assigned overdue loans (the collections permission). */
export async function collectors() {
  const db = await getDb();
  const staff = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, roleKey: users.roleKey, permissions: roles.permissions })
    .from(users).innerJoin(roles, eq(roles.key, users.roleKey)).where(and(eq(roles.kind, "staff"), eq(users.status, "active"))).orderBy(asc(users.firstName));
  return staff.filter((s) => s.roleKey === ADMIN_ROLE || s.permissions.includes("loans.collect")).map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}` }));
}

async function loanFor(loanId: number) {
  const [row] = await (await getDb()).select({ loan: loans, customer: users }).from(loans).innerJoin(users, eq(users.id, loans.userId)).where(eq(loans.id, loanId));
  return row ?? null;
}

export async function assignCollector(staff: CurrentUser, loanId: number, collectorId: number | null): Promise<Result> {
  if (!can(staff, "loans.collect")) return fail("You can't manage collections.");
  const row = await loanFor(loanId);
  if (!row) return fail("Loan not found.");
  const chosen = collectorId === null ? null : (await collectors()).find((c) => c.id === collectorId);
  if (collectorId !== null && !chosen) return fail("Choose someone with the collections permission.");
  await (await getDb()).update(loans).set({ collectorId }).where(eq(loans.id, loanId));
  await logAudit({ actorId: staff.id, action: "collections.assigned", summary: chosen ? `assigned ${row.loan.reference} to ${chosen.name}` : `unassigned ${row.loan.reference}`, target: { type: "loan", id: loanId } });
  return { ok: true, message: collectorId ? "Assigned." : "Unassigned." };
}

export async function createPromise(staff: CurrentUser, loanId: number, amountKobo: number, dueDate: string): Promise<Result> {
  if (!can(staff, "loans.collect")) return fail("You can't manage collections.");
  const row = await loanFor(loanId);
  if (!row || !["active", "defaulted", "written_off"].includes(row.loan.status)) return fail("Promises can only be recorded on unpaid loans.");
  if (!(amountKobo > 0)) return fail("Enter the amount they promised.");
  const today = todayIso();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || dueDate < today) return fail("Choose a date from today onwards.");
  if (daysBetween(today, dueDate) > 60) return fail("Promises should be within 60 days. Consider rescheduling instead.");
  const db = await getDb();
  await db.update(paymentPromises).set({ status: "cancelled", resolvedAt: new Date() }).where(and(eq(paymentPromises.loanId, loanId), eq(paymentPromises.status, "open")));
  await db.insert(paymentPromises).values({ loanId, amount: amountKobo, dueDate, createdById: staff.id });
  await db.insert(customerContacts).values({ customerId: row.customer.id, loanId, authorId: staff.id, channel: "note", outcome: "promised", note: `Promised to pay ${naira(amountKobo)} by ${dueDate}.` });
  await logAudit({ actorId: staff.id, action: "collections.promise", summary: `recorded a promise to pay ${naira(amountKobo)} by ${dueDate} on ${row.loan.reference}`, target: { type: "loan", id: loanId } });
  return { ok: true, message: "Promise recorded. It'll be marked kept or broken automatically." };
}

/** FCCPC rules: contact only the borrower, 8am–6pm, no threats. We also cap reminder SMS at one a day per loan. */
export async function sendCollectionSms(staff: CurrentUser, loanId: number): Promise<Result> {
  if (!can(staff, "loans.collect")) return fail("You can't manage collections.");
  const hour = Number(new Date().toLocaleString("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }));
  if (hour < 8 || hour >= 18) return fail("Reminders can only be sent between 8am and 6pm (Lagos time).");
  const row = await loanFor(loanId);
  if (!row || !["active", "defaulted"].includes(row.loan.status)) return fail("This loan has nothing overdue to remind about.");
  const db = await getDb();
  const startOfDay = new Date(`${todayIso()}T00:00:00+01:00`);
  const [sentToday] = await db.select({ id: customerContacts.id }).from(customerContacts)
    .where(and(eq(customerContacts.loanId, loanId), eq(customerContacts.channel, "sms"), gte(customerContacts.createdAt, startOfDay)));
  if (sentToday) return fail("A reminder was already sent today. Try again tomorrow.");
  const [owed] = await db.select({ total: sql<number>`coalesce(sum(${loanInstalments.principal} + ${loanInstalments.interest} + ${loanInstalments.lateFee} - ${loanInstalments.paid}), 0)` })
    .from(loanInstalments).where(and(eq(loanInstalments.loanId, loanId), eq(loanInstalments.status, "overdue")));
  const text = `${naira(Number(owed.total))} is overdue on your loan ${row.loan.reference}. Please pay in the app, or reply to discuss a plan that works for you.`;
  await notify(row.customer.id, text, { title: "Overdue repayment reminder" });
  await db.insert(customerContacts).values({ customerId: row.customer.id, loanId, authorId: staff.id, channel: "sms", outcome: "other", note: `Reminder SMS: “${text}”` });
  return { ok: true, message: "Reminder sent." };
}

/**
 * Moves every unpaid instalment later by `months` (no extra interest). Optionally waives the late
 * fees not yet paid. For customers who can pay, just not on the original dates.
 */
export async function reschedule(staff: CurrentUser, loanId: number, months: number, waiveLateFees: boolean, note: string): Promise<Result> {
  if (!can(staff, "loans.approve")) return fail("Only staff who approve loans can reschedule them.");
  if (!Number.isInteger(months) || months < 1 || months > 6) return fail("Move the schedule by 1 to 6 months.");
  if (note.trim().length < 5) return fail("Record why the loan is being rescheduled.");
  const row = await loanFor(loanId);
  if (!row || !["active", "defaulted"].includes(row.loan.status)) return fail("Only active or defaulted loans can be rescheduled.");
  const db = await getDb();
  const today = todayIso();
  await db.transaction(async (tx) => {
    const unpaid = await tx.select().from(loanInstalments).where(and(eq(loanInstalments.loanId, loanId), inArray(loanInstalments.status, ["upcoming", "due", "overdue"])));
    for (const i of unpaid) {
      const dueDate = addMonths(i.dueDate < today ? today : i.dueDate, months);
      await tx.update(loanInstalments).set({ dueDate, status: "upcoming", reminderSentAt: null, ...(waiveLateFees ? { lateFee: i.paidLateFee } : {}) }).where(eq(loanInstalments.id, i.id));
    }
    if (row.loan.status === "defaulted") await tx.update(loans).set({ status: "active" }).where(eq(loans.id, loanId));
    await tx.update(paymentPromises).set({ status: "cancelled", resolvedAt: new Date() }).where(and(eq(paymentPromises.loanId, loanId), eq(paymentPromises.status, "open")));
  });
  await logAudit({ actorId: staff.id, action: "loan.rescheduled", summary: `moved ${row.loan.reference}'s unpaid instalments by ${months} month${months > 1 ? "s" : ""}${waiveLateFees ? " and waived unpaid late fees" : ""}: ${note.trim()}`, target: { type: "loan", id: loanId } });
  await notify(row.customer.id, `your loan ${row.loan.reference} has a new repayment schedule. Open the app to see your new dates.`, { title: "New repayment schedule", email: { template: "loan_rescheduled", vars: { reference: row.loan.reference } } });
  return { ok: true, message: "Rescheduled. The customer has been told." };
}

/** Writes off the unpaid principal as a loss. The customer still owes it; later payments are booked as recoveries. */
export async function writeOff(staff: CurrentUser, loanId: number, note: string): Promise<Result> {
  if (!can(staff, "loans.approve")) return fail("Only staff who approve loans can write them off.");
  if (note.trim().length < 5) return fail("Record why the loan is being written off.");
  const db = await getDb();
  const done = await db.transaction(async (tx) => {
    const [loan] = await tx.update(loans).set({ status: "written_off", closedAt: new Date() }).where(and(eq(loans.id, loanId), inArray(loans.status, ["active", "defaulted"]))).returning();
    if (!loan) return null;
    const unpaid = await tx.select().from(loanInstalments).where(eq(loanInstalments.loanId, loanId));
    const principalLeft = unpaid.reduce((s, i) => s + (i.principal - i.paidPrincipal), 0);
    if (principalLeft > 0) {
      await postJournal(tx, { reference: `writeoff:${loan.reference}`, description: `Wrote off ${loan.reference}`, loanId, createdById: staff.id, lines: [{ account: "loanLosses", debit: principalLeft }, { account: "loansReceivable", credit: principalLeft }] });
    }
    await tx.update(paymentPromises).set({ status: "cancelled", resolvedAt: new Date() }).where(and(eq(paymentPromises.loanId, loanId), eq(paymentPromises.status, "open")));
    return { loan, principalLeft };
  });
  if (!done) return fail("Only active or defaulted loans can be written off.");
  await logAudit({ actorId: staff.id, action: "loan.written_off", summary: `wrote off ${done.loan.reference} (${naira(done.principalLeft)} principal): ${note.trim()}`, target: { type: "loan", id: loanId } });
  await report(done.loan, "defaulted");
  return { ok: true, message: `Written off. ${naira(done.principalLeft)} moved to loan losses.` };
}

/** After a payment: open promises that have now been met are marked kept. */
export async function settlePromises(loan: Loan) {
  const db = await getDb();
  const open = await db.select().from(paymentPromises).where(and(eq(paymentPromises.loanId, loan.id), eq(paymentPromises.status, "open")));
  for (const p of open) {
    const [{ paid }] = await db.select({ paid: sql<number>`coalesce(sum(${loanPayments.amount}), 0)` }).from(loanPayments)
      .where(and(eq(loanPayments.loanId, loan.id), eq(loanPayments.status, "success"), gte(loanPayments.paidAt, p.createdAt)));
    if (Number(paid) >= p.amount) await db.update(paymentPromises).set({ status: "kept", resolvedAt: new Date() }).where(eq(paymentPromises.id, p.id));
  }
}

/** Daily: promises past their date and not met become broken, and collectors are told. */
export async function markBrokenPromises(): Promise<number> {
  const db = await getDb();
  const due = await db.select({ p: paymentPromises, loan: loans, firstName: users.firstName, lastName: users.lastName })
    .from(paymentPromises).innerJoin(loans, eq(loans.id, paymentPromises.loanId)).innerJoin(users, eq(users.id, loans.userId))
    .where(and(eq(paymentPromises.status, "open"), lt(paymentPromises.dueDate, todayIso())));
  for (const { p, loan, firstName, lastName } of due) {
    await settlePromises(loan);
    const [still] = await db.select({ status: paymentPromises.status }).from(paymentPromises).where(eq(paymentPromises.id, p.id));
    if (still?.status !== "open") continue;
    await db.update(paymentPromises).set({ status: "broken", resolvedAt: new Date() }).where(eq(paymentPromises.id, p.id));
    await notifyStaff("loans.collect", { category: "collections", title: "Promise to pay broken", body: `${firstName} ${lastName} didn't pay ${naira(p.amount)} by ${p.dueDate} (${loan.reference})`, href: `/console/loans/${loan.id}` });
  }
  return due.length;
}

export async function loanContacts(loanId: number) {
  const author = alias(users, "author");
  return (await getDb()).select({ c: customerContacts, authorFirst: author.firstName, authorLast: author.lastName })
    .from(customerContacts).leftJoin(author, eq(author.id, customerContacts.authorId))
    .where(eq(customerContacts.loanId, loanId)).orderBy(desc(customerContacts.createdAt)).limit(30);
}

export async function loanPromises(loanId: number) {
  return (await getDb()).select().from(paymentPromises).where(eq(paymentPromises.loanId, loanId)).orderBy(desc(paymentPromises.createdAt));
}

