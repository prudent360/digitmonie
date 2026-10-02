import "server-only";
import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import { getDb } from "@/db";
import { loanPayments, loans, payouts, users } from "@/db/schema";

export async function recentPayouts(limit = 30) {
  return (await getDb()).select({ p: payouts, loanRef: loans.reference, loanId: loans.id, loanStatus: loans.status, firstName: users.firstName, lastName: users.lastName })
    .from(payouts).innerJoin(loans, eq(loans.id, payouts.loanId)).innerJoin(users, eq(users.id, loans.userId))
    .orderBy(desc(payouts.createdAt)).limit(limit);
}

export async function recentRepayments(limit = 30) {
  return (await getDb()).select({ p: loanPayments, loanRef: loans.reference, loanId: loans.id, firstName: users.firstName, lastName: users.lastName })
    .from(loanPayments).innerJoin(loans, eq(loans.id, loanPayments.loanId)).innerJoin(users, eq(users.id, loans.userId))
    .where(eq(loanPayments.status, "success")).orderBy(desc(loanPayments.paidAt)).limit(limit);
}

/** Transfers stuck for over 15 minutes, and failed transfers whose loan still hasn't been paid. */
export async function payoutsNeedingAttention() {
  return (await getDb()).select({ p: payouts, loanRef: loans.reference, loanId: loans.id, firstName: users.firstName, lastName: users.lastName })
    .from(payouts).innerJoin(loans, eq(loans.id, payouts.loanId)).innerJoin(users, eq(users.id, loans.userId))
    .where(or(
      and(eq(payouts.status, "processing"), lt(payouts.createdAt, new Date(Date.now() - 15 * 60 * 1000))),
      and(eq(payouts.status, "failed"), inArray(loans.status, ["approved"])),
    ))
    .orderBy(desc(payouts.createdAt));
}
