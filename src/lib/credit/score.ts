import type { BureauSummary, ScoreDetails } from "@/db/schema";
import type { RepaymentHistory } from "./limits";

type Input = {
  kycTier: number;
  /** kobo per month, as declared by the customer */
  monthlyIncome: number;
  instalment: number;
  history: RepaymentHistory;
  bureau: BureauSummary | null;
  accountAgeDays: number;
};

/**
 * Transparent rules-based score (0–100). Every point is explained to the reviewer.
 * Hard stops always decline; otherwise 70+ can be approved automatically (if the product allows), 30–69 goes to a person.
 * A new Tier 1 customer with a clean bureau record and repayments under 20% of income scores exactly 70.
 */
export function scoreApplication(i: Input): ScoreDetails {
  const reasons: { label: string; points: number }[] = [];
  const hardStops: string[] = [];
  const add = (label: string, points: number) => reasons.push({ label, points });

  add(`KYC Tier ${i.kycTier}`, [0, 15, 25, 30][i.kycTier] ?? 0);

  const dti = i.monthlyIncome > 0 ? i.instalment / i.monthlyIncome : Infinity;
  const dtiPct = Number.isFinite(dti) ? `${Math.round(dti * 100)}%` : "no income";
  if (dti <= 0.2) add(`Repayment is ${dtiPct} of income`, 35);
  else if (dti <= 0.33) add(`Repayment is ${dtiPct} of income`, 20);
  else if (dti <= 0.5) add(`Repayment is ${dtiPct} of income`, 5);
  else hardStops.push(`Repayment would be ${dtiPct} of declared income (over 50%)`);

  if (i.history.defaulted) hardStops.push("Has defaulted on a DigitMonie loan");
  if (i.history.repaidOnTime) add(`${i.history.repaidOnTime} DigitMonie loan${i.history.repaidOnTime > 1 ? "s" : ""} repaid on time`, Math.min(25, 10 * i.history.repaidOnTime));
  if (i.history.repaidLate) add(`${i.history.repaidLate} loan${i.history.repaidLate > 1 ? "s" : ""} repaid late`, -15);
  if (!i.history.repaidOnTime && !i.history.repaidLate) add("First DigitMonie loan", 0);

  if (!i.bureau) add("No credit bureau check available", -10);
  else if (i.bureau.delinquent) hardStops.push(`Credit bureau: ${i.bureau.worstStatus} with another lender`);
  else {
    add(`Credit bureau: ${i.bureau.worstStatus.toLowerCase()}`, 20);
    if (i.bureau.openLoans >= 4) add(`${i.bureau.openLoans} open loans with other lenders`, -15);
  }

  add(i.accountAgeDays >= 90 ? "Customer for 3+ months" : "New customer", i.accountAgeDays >= 90 ? 10 : 0);

  const score = Math.max(0, Math.min(100, reasons.reduce((s, r) => s + r.points, 0)));
  const band = score >= 75 ? "A" : score >= 60 ? "B" : score >= 45 ? "C" : "D";
  const recommendation = hardStops.length || score < 30 ? "decline" : score >= 70 ? "approve" : "review";
  return { score, band, recommendation, reasons, hardStops };
}
