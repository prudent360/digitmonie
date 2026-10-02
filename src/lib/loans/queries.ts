import "server-only";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import { creditProfiles, kycProfiles, loanDocuments, loanInstalments, loanPayments, loanProducts, loans, users, type LoanStatus } from "@/db/schema";

export async function customerLoans(userId: number) {
  return (await getDb()).select({ loan: loans, productName: loanProducts.name }).from(loans)
    .innerJoin(loanProducts, eq(loanProducts.id, loans.productId)).where(eq(loans.userId, userId)).orderBy(desc(loans.createdAt));
}

export async function loanPaymentsFor(loanId: number) {
  return (await getDb()).select().from(loanPayments).where(and(eq(loanPayments.loanId, loanId), eq(loanPayments.status, "success"))).orderBy(desc(loanPayments.paidAt));
}

export const QUEUES: { key: string; label: string; statuses: LoanStatus[] }[] = [
  { key: "review", label: "To review", statuses: ["pending"] },
  { key: "approval", label: "To approve", statuses: ["reviewed"] },
  { key: "payout", label: "To pay out", statuses: ["approved"] },
  { key: "active", label: "Active", statuses: ["active"] },
  { key: "overdue", label: "Overdue", statuses: ["active"] },
  { key: "closed", label: "Closed", statuses: ["repaid", "declined", "cancelled", "defaulted", "written_off"] },
];

/** Active loans with at least one overdue instalment, with the amount and days overdue. */
async function overdueLoanIds() {
  const rows = await (await getDb()).select({ loanId: loanInstalments.loanId, oldest: sql<string>`min(${loanInstalments.dueDate})`, owed: sql<number>`sum(${loanInstalments.principal} + ${loanInstalments.interest} + ${loanInstalments.lateFee} - ${loanInstalments.paid})` })
    .from(loanInstalments).where(eq(loanInstalments.status, "overdue")).groupBy(loanInstalments.loanId);
  return new Map(rows.map((r) => [r.loanId, { oldest: r.oldest, owed: Number(r.owed) }]));
}

export async function staffLoanQueue(queueKey: string) {
  const queue = QUEUES.find((q) => q.key === queueKey) ?? QUEUES[0];
  const db = await getDb();
  const overdue = await overdueLoanIds();
  let rows = await db.select({ loan: loans, productName: loanProducts.name, firstName: users.firstName, lastName: users.lastName, kycTier: users.kycTier })
    .from(loans).innerJoin(loanProducts, eq(loanProducts.id, loans.productId)).innerJoin(users, eq(users.id, loans.userId))
    .where(inArray(loans.status, queue.statuses))
    .orderBy(queue.key === "closed" || queue.key === "active" ? desc(loans.createdAt) : asc(loans.createdAt)).limit(200);
  if (queue.key === "overdue") rows = rows.filter((r) => overdue.has(r.loan.id));
  return { queue, rows, overdue };
}

export async function loanQueueCounts() {
  const db = await getDb();
  const rows = await db.select({ status: loans.status, n: count() }).from(loans).groupBy(loans.status);
  const by = (s: LoanStatus) => rows.find((r) => r.status === s)?.n ?? 0;
  return { review: by("pending"), approval: by("reviewed"), payout: by("approved"), active: by("active"), overdue: (await overdueLoanIds()).size };
}

const reviewer = alias(users, "reviewer");
const approver = alias(users, "approver");

export async function staffLoanDetail(id: number) {
  const db = await getDb();
  const [row] = await db.select({ loan: loans, product: loanProducts, customer: users, reviewerFirst: reviewer.firstName, reviewerLast: reviewer.lastName, approverFirst: approver.firstName, approverLast: approver.lastName })
    .from(loans).innerJoin(loanProducts, eq(loanProducts.id, loans.productId)).innerJoin(users, eq(users.id, loans.userId))
    .leftJoin(reviewer, eq(reviewer.id, loans.reviewedById)).leftJoin(approver, eq(approver.id, loans.approvedById))
    .where(eq(loans.id, id));
  if (!row) return null;
  const [kyc] = await db.select().from(kycProfiles).where(eq(kycProfiles.userId, row.customer.id));
  const [credit] = await db.select().from(creditProfiles).where(eq(creditProfiles.userId, row.customer.id));
  const documents = await db.select({ id: loanDocuments.id, fileName: loanDocuments.fileName, mimeType: loanDocuments.mimeType, size: loanDocuments.size }).from(loanDocuments).where(eq(loanDocuments.loanId, id));
  const otherLoans = await db.select({ id: loans.id, reference: loans.reference, status: loans.status, principal: loans.principal, createdAt: loans.createdAt }).from(loans).where(eq(loans.userId, row.customer.id)).orderBy(desc(loans.createdAt));
  return { ...row, kyc: kyc ?? null, credit: credit ?? null, documents, otherLoans: otherLoans.filter((l) => l.id !== id) };
}
