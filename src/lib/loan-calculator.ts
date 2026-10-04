// The standalone loan calculator (/tools/loan-calculator). Runs in the browser. Amounts are worked in kobo
// so rounding is exact; the last instalment absorbs any rounding so the schedule always ends at zero.
// Separate from lib/loans/math.ts, which prices DigitMonie's own monthly loans.

export type Frequency = "monthly" | "quarterly" | "semiannual" | "annual";
export type Method = "reducing" | "flat";
export type RateBasis = "year" | "month";

export const FREQUENCIES: { value: Frequency; label: string; months: number; per: string }[] = [
  { value: "monthly", label: "Monthly", months: 1, per: "month" },
  { value: "quarterly", label: "Quarterly", months: 3, per: "quarter" },
  { value: "semiannual", label: "Every 6 months", months: 6, per: "half-year" },
  { value: "annual", label: "Yearly", months: 12, per: "year" },
];

export type CalculatorInput = {
  /** Naira. */
  amount: number;
  /** Interest rate in percent, per year or per month (see `basis`). */
  rate: number;
  basis: RateBasis;
  /** Loan duration in months. */
  months: number;
  frequency: Frequency;
  method: Method;
  /** First repayment month, "YYYY-MM". */
  start: string;
};

export type Line = { n: number; month: string; opening: number; payment: number; interest: number; principal: number; closing: number };

export type Result = {
  lines: Line[];
  /** Regular repayment (the first one; the last may differ by rounding). Naira. */
  payment: number;
  totalPayment: number;
  totalInterest: number;
  instalments: number;
  /** Nominal annual rate in percent, as entered (converted to per year). */
  annualRate: number;
  /** The true annual cost (APR) in percent: the same as the annual rate for reducing balance, higher for flat. */
  apr: number;
  firstMonth: string;
  lastMonth: string;
};

const kobo = (naira: number) => Math.round(naira * 100);
const naira = (k: number) => k / 100;

/** "2026-10" plus `n` months. */
export function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function formatMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-NG", { month: "short", year: "numeric", timeZone: "UTC" });
}

/** The periodic rate r for which the payments are worth exactly the amount borrowed (bisection). */
function periodicRate(amount: number, payments: number[]): number {
  const pv = (r: number) => payments.reduce((s, p, i) => s + p / Math.pow(1 + r, i + 1), 0);
  if (pv(0) <= amount) return 0;
  let lo = 0, hi = 1;
  for (let k = 0; k < 100; k++) {
    const mid = (lo + hi) / 2;
    if (pv(mid) > amount) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function calculate(input: CalculatorInput): Result | null {
  const { amount, rate, months, method, start } = input;
  if (!(amount > 0) || !(rate >= 0) || !(months >= 1) || !/^\d{4}-\d{2}$/.test(start)) return null;
  const period = FREQUENCIES.find((f) => f.value === input.frequency)!.months;
  const instalments = Math.max(1, Math.ceil(months / period));
  const annualRate = input.basis === "month" ? rate * 12 : rate;
  const r = (annualRate / 100) * (period / 12);
  const principal = kobo(amount);
  const lines: Line[] = [];

  if (method === "reducing") {
    const regular = r === 0 ? Math.round(principal / instalments) : Math.round((principal * r) / (1 - Math.pow(1 + r, -instalments)));
    let balance = principal;
    for (let n = 1; n <= instalments; n++) {
      const interest = Math.round(balance * r);
      const capital = n === instalments ? balance : Math.min(balance, regular - interest);
      lines.push({ n, month: addMonths(start, (n - 1) * period), opening: balance, payment: capital + interest, interest, principal: capital, closing: balance - capital });
      balance -= capital;
    }
  } else {
    // Flat: interest is charged on the original amount for the whole duration, spread evenly.
    const totalInterest = Math.round(principal * (annualRate / 100) * (months / 12));
    const capitalEach = Math.floor(principal / instalments);
    const interestEach = Math.floor(totalInterest / instalments);
    let balance = principal;
    for (let n = 1; n <= instalments; n++) {
      const last = n === instalments;
      const capital = last ? balance : capitalEach;
      const interest = last ? totalInterest - interestEach * (instalments - 1) : interestEach;
      lines.push({ n, month: addMonths(start, (n - 1) * period), opening: balance, payment: capital + interest, interest, principal: capital, closing: balance - capital });
      balance -= capital;
    }
  }

  const totalPayment = lines.reduce((s, l) => s + l.payment, 0);
  const apr = periodicRate(principal, lines.map((l) => l.payment)) * (12 / period) * 100;
  return {
    lines: lines.map((l) => ({ ...l, opening: naira(l.opening), payment: naira(l.payment), interest: naira(l.interest), principal: naira(l.principal), closing: naira(l.closing) })),
    payment: naira(lines[0].payment),
    totalPayment: naira(totalPayment),
    totalInterest: naira(totalPayment - principal),
    instalments,
    annualRate,
    apr: method === "reducing" ? annualRate : apr,
    firstMonth: lines[0].month,
    lastMonth: lines[lines.length - 1].month,
  };
}
