import "server-only";
import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { creditProfiles, loanInstalments, loans } from "@/db/schema";

import { getSettings } from "@/lib/settings";

/** Starting limits, growth and cap come from Console → Settings → Lending rules (in naira there; kobo here). */
async function limitRules() {
  const s = await getSettings("limitTier1", "limitTier2", "limitTier3", "limitGrowth", "limitCap");
  const kobo = (v: unknown) => Math.round(Number(v) * 100);
  return { starting: [0, kobo(s.limitTier1), kobo(s.limitTier2), kobo(s.limitTier3)], growth: Number(s.limitGrowth) / 100, cap: kobo(s.limitCap) };
}

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
  const rules = await limitRules();
  const growth = history.repaidLate > 0 ? 1 : 1 + rules.growth * history.repaidOnTime;
  return { limit: Math.min(rules.cap, Math.round((rules.starting[kycTier] ?? 0) * growth)), history, overridden: false };
}
