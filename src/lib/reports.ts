import "server-only";
import { and, count, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { customerContacts, ledgerEntries, ledgerLines, loanInstalments, loanPayments, loanProducts, loans, paymentPromises, users } from "@/db/schema";
import { BUCKETS, daysBetween } from "./collections";
import { ACCOUNTS } from "./ledger-accounts";
import { todayIso } from "./loans/math";
import { CUSTOMER_ROLE } from "./permissions";

/** "YYYY-MM" in Lagos time (UTC+1) for a timestamp column. */
const month = (col: unknown) => sql<string>`to_char(${col} + interval '1 hour', 'YYYY-MM')`;
const since = (days: number) => new Date(Date.now() - days * 86_400_000);

/** The last `n` months as { key: "2026-10", label: "Oct" }, oldest first. */
export function lastMonths(n = 12) {
  const now = new Date(Date.now() + 60 * 60 * 1000);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (n - 1 - i), 1));
    return { key: d.toISOString().slice(0, 7), label: d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }) };
  });
}

/** Outstanding principal, portfolio at risk and how overdue the book is. */
export async function portfolio() {
  const db = await getDb();
  const rows = await db.select({
    loanId: loanInstalments.loanId,
    principalLeft: sql<number>`sum(${loanInstalments.principal} - ${loanInstalments.paidPrincipal})`,
    owed: sql<number>`sum(${loanInstalments.principal} + ${loanInstalments.interest} + ${loanInstalments.lateFee} - ${loanInstalments.paid})`,
    oldestOverdue: sql<string | null>`min(case when ${loanInstalments.status} = 'overdue' then ${loanInstalments.dueDate} end)`,
  }).from(loanInstalments).innerJoin(loans, eq(loans.id, loanInstalments.loanId))
    .where(inArray(loans.status, ["active", "defaulted"])).groupBy(loanInstalments.loanId);
  const today = todayIso();
  const buckets = [{ key: "current", label: "Up to date", loans: 0, principal: 0 }, ...BUCKETS.map((b) => ({ key: b.key as string, label: b.label as string, loans: 0, principal: 0 }))];
  let principal = 0, owed = 0, par30 = 0;
  for (const r of rows) {
    const p = Number(r.principalLeft), dpd = r.oldestOverdue ? daysBetween(r.oldestOverdue, today) : 0;
    principal += p; owed += Number(r.owed);
    if (dpd > 30) par30 += p;
    const b = dpd === 0 ? buckets[0] : buckets.find((x) => { const def = BUCKETS.find((y) => y.key === x.key); return def && dpd >= def.min && dpd <= def.max; })!;
    b.loans++; b.principal += p;
  }
  return { activeLoans: rows.length, principal, owed, par30, par30Ratio: principal ? par30 / principal : 0, buckets };
}

/** Disbursed vs collected, new customers and revenue for each of the last 12 months. */
export async function monthlySeries(n = 12) {
  const db = await getDb();
  const months = lastMonths(n);
  const from = new Date(`${months[0].key}-01T00:00:00+01:00`);
  const [disbursed, collected, signups, revenue] = await Promise.all([
    db.select({ m: month(loans.disbursedAt), v: sql<number>`sum(${loans.principal})` }).from(loans).where(gte(loans.disbursedAt, from)).groupBy(month(loans.disbursedAt)),
    db.select({ m: month(loanPayments.paidAt), v: sql<number>`sum(${loanPayments.amount})` }).from(loanPayments).where(and(eq(loanPayments.status, "success"), gte(loanPayments.paidAt, from))).groupBy(month(loanPayments.paidAt)),
    db.select({ m: month(users.createdAt), v: count() }).from(users).where(and(eq(users.roleKey, CUSTOMER_ROLE), gte(users.createdAt, from))).groupBy(month(users.createdAt)),
    db.select({ m: month(ledgerEntries.createdAt), account: ledgerLines.accountCode, credit: sql<number>`sum(${ledgerLines.credit})`, debit: sql<number>`sum(${ledgerLines.debit})` })
      .from(ledgerLines).innerJoin(ledgerEntries, eq(ledgerEntries.id, ledgerLines.entryId)).where(gte(ledgerEntries.createdAt, from)).groupBy(month(ledgerEntries.createdAt), ledgerLines.accountCode),
  ]);
  const pick = (rows: { m: string; v: number }[], key: string) => Number(rows.find((r) => r.m === key)?.v ?? 0);
  const rev = (key: string, code: string, side: "credit" | "debit" = "credit") => Number(revenue.find((r) => r.m === key && r.account === code)?.[side] ?? 0);
  return months.map(({ key, label }) => ({
    key, label,
    disbursed: pick(disbursed, key), collected: pick(collected, key), newCustomers: pick(signups, key),
    interest: rev(key, ACCOUNTS.interestIncome.code), fees: rev(key, ACCOUNTS.feeIncome.code), lateFees: rev(key, ACCOUNTS.lateFeeIncome.code),
    recoveries: rev(key, ACCOUNTS.recoveries.code), losses: rev(key, ACCOUNTS.loanLosses.code, "debit"), providerFees: rev(key, ACCOUNTS.providerFees.code, "debit"),
  }));
}

/** Applications in the period: outcomes, approval rate and how fast decisions are made. */
export async function funnel(days: number) {
  const db = await getDb();
  const rows = await db.select({ status: loans.status, auto: loans.autoApproved, n: count() }).from(loans).where(gte(loans.createdAt, since(days))).groupBy(loans.status, loans.autoApproved);
  const total = rows.reduce((s, r) => s + r.n, 0);
  const sum = (statuses: string[]) => rows.filter((r) => statuses.includes(r.status)).reduce((s, r) => s + r.n, 0);
  const approved = sum(["approved", "active", "repaid", "defaulted", "written_off"]);
  const declined = sum(["declined"]);
  const [speed] = await db.select({ hours: sql<number | null>`avg(extract(epoch from (${loans.approvedAt} - ${loans.createdAt})) / 3600)` })
    .from(loans).where(and(gte(loans.createdAt, since(days)), isNotNull(loans.approvedAt)));
  return {
    total, approved, declined, cancelled: sum(["cancelled"]), waiting: sum(["pending", "reviewed"]),
    autoApproved: rows.filter((r) => r.auto).reduce((s, r) => s + r.n, 0),
    approvalRate: approved + declined ? approved / (approved + declined) : 0,
    avgDecisionHours: speed?.hours == null ? null : Number(speed.hours),
  };
}

export async function productPerformance() {
  const db = await getDb();
  const products = await db.select().from(loanProducts);
  const loanRows = await db.select({ productId: loans.productId, status: loans.status, principal: loans.principal, id: loans.id }).from(loans).where(inArray(loans.status, ["active", "repaid", "defaulted", "written_off"]));
  const left = await db.select({ loanId: loanInstalments.loanId, p: sql<number>`sum(${loanInstalments.principal} - ${loanInstalments.paidPrincipal})` }).from(loanInstalments).groupBy(loanInstalments.loanId);
  const interest = await db.select({ productId: loans.productId, v: sql<number>`sum(${ledgerLines.credit})` }).from(ledgerLines).innerJoin(ledgerEntries, eq(ledgerEntries.id, ledgerLines.entryId)).innerJoin(loans, eq(loans.id, ledgerEntries.loanId))
    .where(eq(ledgerLines.accountCode, ACCOUNTS.interestIncome.code)).groupBy(loans.productId);
  return products.map((p) => {
    const mine = loanRows.filter((l) => l.productId === p.id);
    const open = mine.filter((l) => l.status === "active" || l.status === "defaulted");
    return {
      id: p.id, name: p.name, active: p.active,
      loans: mine.length,
      disbursed: mine.reduce((s, l) => s + l.principal, 0),
      outstanding: open.reduce((s, l) => s + Number(left.find((x) => x.loanId === l.id)?.p ?? 0), 0),
      repaid: mine.filter((l) => l.status === "repaid").length,
      badLoans: mine.filter((l) => l.status === "defaulted" || l.status === "written_off").length,
      interest: Number(interest.find((x) => x.productId === p.id)?.v ?? 0),
    };
  });
}

export async function collectionsStats(days: number) {
  const db = await getDb();
  const promises = await db.select({ status: paymentPromises.status, n: count() }).from(paymentPromises).where(gte(paymentPromises.createdAt, since(days))).groupBy(paymentPromises.status);
  const [{ contacts }] = await db.select({ contacts: count() }).from(customerContacts).where(and(gte(customerContacts.createdAt, since(days)), inArray(customerContacts.channel, ["call", "sms", "whatsapp", "email", "visit"])));
  const by = (s: string) => promises.find((p) => p.status === s)?.n ?? 0;
  const resolved = by("kept") + by("broken");
  return { contacts, promisesMade: promises.reduce((s, p) => s + p.n, 0), kept: by("kept"), broken: by("broken"), keptRate: resolved ? by("kept") / resolved : null };
}

export async function customerStats(days: number) {
  const db = await getDb();
  const isCustomer = eq(users.roleKey, CUSTOMER_ROLE);
  const [[{ total }], [{ verified }], [{ fresh }]] = await Promise.all([
    db.select({ total: count() }).from(users).where(isCustomer),
    db.select({ verified: count() }).from(users).where(and(isCustomer, gte(users.kycTier, 1))),
    db.select({ fresh: count() }).from(users).where(and(isCustomer, gte(users.createdAt, since(days)))),
  ]);
  return { total, verified, fresh };
}
