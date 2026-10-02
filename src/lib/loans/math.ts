// Loan arithmetic in kobo (whole numbers). Shared by the browser preview and the server,
// so what the customer sees is exactly what they're charged.

export type InterestMethod = "reducing" | "flat";
export type ScheduleLine = { n: number; dueDate: string; principal: number; interest: number; total: number };
export type Quote = {
  principal: number;
  processingFee: number;
  /** What lands in the customer's account (principal minus the fee). */
  disbursed: number;
  totalInterest: number;
  totalRepayable: number;
  /** First (and, except for rounding, every) instalment. */
  instalment: number;
  /** Annual percentage rate including the fee, in basis points. */
  aprBps: number;
  schedule: ScheduleLine[];
};

export const toKobo = (naira: number) => Math.round(naira * 100);
export const toNaira = (kobo: number) => kobo / 100;

/** Same day of the month, `months` later; falls back to the month's last day (31 Jan + 1 → 28/29 Feb). */
export function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

export function todayIso(now = new Date()): string {
  // Dates are in Nigerian time (UTC+1).
  return new Date(now.getTime() + 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function buildSchedule(principal: number, tenor: number, rateBps: number, method: InterestMethod, start: string): ScheduleLine[] {
  const r = rateBps / 10_000;
  const lines: ScheduleLine[] = [];
  let balance = principal;
  if (method === "flat" || r === 0) {
    const interest = Math.round(principal * r);
    const base = Math.floor(principal / tenor);
    for (let n = 1; n <= tenor; n++) {
      const p = n === tenor ? principal - base * (tenor - 1) : base;
      lines.push({ n, dueDate: addMonths(start, n), principal: p, interest, total: p + interest });
    }
    return lines;
  }
  const payment = Math.ceil((principal * r) / (1 - Math.pow(1 + r, -tenor)));
  for (let n = 1; n <= tenor; n++) {
    const interest = Math.round(balance * r);
    const p = n === tenor ? balance : Math.min(balance, payment - interest);
    balance -= p;
    lines.push({ n, dueDate: addMonths(start, n), principal: p, interest, total: p + interest });
  }
  return lines;
}

/** Monthly rate i such that disbursed = Σ payment_k / (1+i)^k, found by bisection; returned as an annual rate in bps. */
function aprBps(disbursed: number, schedule: ScheduleLine[]): number {
  if (disbursed <= 0) return 0;
  const pv = (i: number) => schedule.reduce((sum, l) => sum + l.total / Math.pow(1 + i, l.n), 0);
  let lo = 0, hi = 1;
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2;
    if (pv(mid) > disbursed) lo = mid;
    else hi = mid;
  }
  return Math.round(((lo + hi) / 2) * 12 * 10_000);
}

export function quoteLoan(input: { principal: number; tenor: number; monthlyRateBps: number; method: InterestMethod; processingFeeBps: number; start?: string }): Quote {
  const schedule = buildSchedule(input.principal, input.tenor, input.monthlyRateBps, input.method, input.start ?? todayIso());
  const processingFee = Math.round((input.principal * input.processingFeeBps) / 10_000);
  const totalInterest = schedule.reduce((s, l) => s + l.interest, 0);
  const disbursed = input.principal - processingFee;
  return {
    principal: input.principal,
    processingFee,
    disbursed,
    totalInterest,
    totalRepayable: input.principal + totalInterest,
    instalment: schedule[0]?.total ?? 0,
    aprBps: aprBps(disbursed, schedule),
    schedule,
  };
}

export const bpsToPercent = (bps: number, digits = 1) => `${(bps / 100).toFixed(digits).replace(/\.0+$/, "")}%`;
