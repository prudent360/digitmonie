import "server-only";
import type { BureauSummary, Loan } from "@/db/schema";

export type BureauEvent = "disbursed" | "payment" | "repaid" | "overdue" | "defaulted";

/**
 * A licensed credit bureau (CRC, FirstCentral, CreditRegistry). Each bureau's API comes with its
 * subscription agreement; add an adapter implementing this interface and select it with CREDIT_BUREAU.
 */
export interface CreditBureau {
  name: string;
  check(applicant: { bvn: string; firstName: string; lastName: string; dateOfBirth: string }): Promise<BureauSummary>;
  /** Sends a loan's latest status, as the Credit Reporting Act expects of lenders. */
  report(loan: Loan, event: BureauEvent): Promise<void>;
}

/**
 * Test bureau, never contacts anyone. Outcome follows the BVN's last digit:
 *  9 → delinquent elsewhere · 8 → five open loans, ₦2.4m owed · anything else → clean, one small loan.
 */
const sandboxBureau: CreditBureau = {
  name: "sandbox",
  async check({ bvn }) {
    const last = bvn.slice(-1);
    const base = { provider: "sandbox", checkedAt: new Date().toISOString(), lenders: 1 };
    if (last === "9") return { ...base, score: 420, openLoans: 3, outstanding: 85_000_000, delinquent: true, worstStatus: "90+ days overdue", lenders: 3 };
    if (last === "8") return { ...base, score: 560, openLoans: 5, outstanding: 240_000_000, delinquent: false, worstStatus: "Up to date", lenders: 5 };
    return { ...base, score: 690, openLoans: 1, outstanding: 15_000_000, delinquent: false, worstStatus: "Up to date" };
  },
  async report(loan, event) {
    console.info(`[bureau:sandbox] would report ${loan.reference}: ${event}`);
  },
};

/** null when no bureau is connected (production without CREDIT_BUREAU): applications then go to staff. */
export function creditBureau(): CreditBureau | null {
  const chosen = process.env.CREDIT_BUREAU;
  if (chosen === "sandbox" || (!chosen && process.env.NODE_ENV !== "production")) return sandboxBureau;
  return null;
}
