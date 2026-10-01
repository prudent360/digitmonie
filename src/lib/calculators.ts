// Indicative rates for the public calculators. Placeholder values until product pricing is set.
export const SAVINGS_RATE = 0.14; // per annum
export const INVEST_RATES: Record<number, number> = { 3: 0.16, 6: 0.18, 9: 0.195, 12: 0.21 };
export const LOAN_MONTHLY_RATE = 0.035;
export const WITHHOLDING_TAX = 0.1;

/** Monthly contributions compounding monthly. */
export function savingsProjection(monthly: number, months: number, rate = SAVINGS_RATE) {
  const r = rate / 12;
  const total = monthly * ((Math.pow(1 + r, months) - 1) / r);
  const contributed = monthly * months;
  return { total, contributed, interest: total - contributed };
}

/** Fixed-term investment, simple interest, net of withholding tax. */
export function investmentProjection(amount: number, months: number) {
  const rate = INVEST_RATES[months] ?? INVEST_RATES[12];
  const gross = amount * rate * (months / 12);
  const net = gross * (1 - WITHHOLDING_TAX);
  return { rate, gross, net, payout: amount + net };
}

/** Reducing-balance loan repayment. */
export function loanRepayment(amount: number, months: number, monthlyRate = LOAN_MONTHLY_RATE) {
  const monthly = (amount * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
  return { monthly, total: monthly * months, interest: monthly * months - amount };
}
