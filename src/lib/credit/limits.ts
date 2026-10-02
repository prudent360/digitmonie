import "server-only";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { creditProfiles, loanInstalments, loans } from "@/db/schema";

/** Starting limit by KYC tier, in kobo. Grows 50% for each loan repaid with no late instalments. */
export const STARTING_LIMIT: Record<number, number> = { 0: 0, 1: 5_000_000, 2: 20_000_000, 3: 100_000_000 };
const GROWTH_PER_GOOD_LOAN = 0.5;
const CAP = 500_000_000;

export type RepaymentHistory = { repaidOnTime: number; repaidLate: number; defaulted: number; open: number };

export async function repaymentHistory(userId: number): Promise<RepaymentHistory> {
  const db = await getDb();
  const rows = await db.select({ id: loans.id, status: loans.status }).from(loans).where(eq(loans.userId, userId));
  const closedIds = rows.filter((r) => r.status === "repaid").map((r) => r.id);
  // A loan with any instalment that picked up a late fee wasn't repaid on time.
  const late = new Set(
    closedIds.length
      ? (await db.select({ loanId: loanInstalments.loanId, lateFee: loanInstalments.lateFee }).from(loanInstalments).where(inArray(loanInstalments.loanId, closedIds)))
          .filter((i) => i.lateFee > 0).map((i) => i.loanId)
      : [],
  );
  return {
    repaidOnTime: closedIds.filter((id) => !late.has(id)).length,
    repaidLate: late.size,
    defaulted: rows.filter((r) => r.status === "defaulted" || r.status === "written_off").length,
    open: rows.filter((r) => ["pending", "reviewed", "approved", "active"].includes(r.status)).length,
  };
}

export async function creditLimit(userId: number, kycTier: number): Promise<{ limit: number; history: RepaymentHistory; overridden: boolean }> {
  const history = await repaymentHistory(userId);
  const [profile] = await (await getDb()).select({ limitOverride: creditProfiles.limitOverride }).from(creditProfiles).where(eq(creditProfiles.userId, userId));
  if (profile?.limitOverride != null) return { limit: profile.limitOverride, history, overridden: true };
  if (history.defaulted > 0) return { limit: 0, history, overridden: false };
  const growth = history.repaidLate > 0 ? 1 : 1 + GROWTH_PER_GOOD_LOAN * history.repaidOnTime;
  return { limit: Math.min(CAP, Math.round((STARTING_LIMIT[kycTier] ?? 0) * growth)), history, overridden: false };
}
