import type { Loan } from "@/db/schema";
import { formatDate } from "@/lib/format";
import { bpsToPercent, buildSchedule, todayIso, toNaira } from "@/lib/loans/math";

const ngn = (kobo: number) => `₦${toNaira(kobo).toLocaleString("en-NG", { minimumFractionDigits: kobo % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

/**
 * Key facts and repayment plan for a loan that hasn't been paid out yet. Due dates are counted from
 * today; the real schedule starts on the day the money is sent.
 */
export function LoanPlan({ loan, productName }: { loan: Loan; productName: string }) {
  const schedule = buildSchedule(loan.principal, loan.tenorMonths, loan.monthlyRateBps, loan.interestMethod, todayIso());
  const rows: [string, string, boolean?][] = [
    ["Loan amount", ngn(loan.principal)],
    [`Processing fee (taken from the loan)`, ngn(loan.processingFee)],
    ["Paid into your account", `${ngn(loan.principal - loan.processingFee)} · ${loan.payoutBank} ••${loan.payoutAccount.slice(-4)} (${loan.payoutName})`],
    [`Interest (${bpsToPercent(loan.monthlyRateBps)} a month, ${loan.interestMethod === "flat" ? "flat" : "reducing balance"})`, ngn(loan.totalInterest)],
    ["Total to repay", ngn(loan.totalRepayable), true],
    ["Monthly repayment", `${ngn(loan.instalment)} × ${loan.tenorMonths}`],
    ["Annual percentage rate (APR)", bpsToPercent(loan.aprBps)],
    ["If a repayment is late", `${bpsToPercent(loan.lateFeeBps)} one-off fee`],
  ];
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted">{productName} · {loan.reference} · for {loan.purpose}</p>
        <dl className="mt-3 divide-y divide-line text-sm">
          {rows.map(([k, v, strong]) => (
            <div key={k} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2.5"><dt className="text-muted">{k}</dt><dd className={`text-right tabular-nums ${strong ? "font-display text-base font-bold text-ink" : "font-semibold text-ink"}`}>{v}</dd></div>
          ))}
        </dl>
      </div>
      <div>
        <h3 className="text-sm font-bold text-ink">Repayment plan</h3>
        <table className="mt-2 w-full text-sm">
          <thead><tr className="text-left text-xs text-muted"><th className="py-1.5 font-semibold">#</th><th className="py-1.5 font-semibold">Due (estimated)</th><th className="py-1.5 text-right font-semibold">Amount</th></tr></thead>
          <tbody>
            {schedule.map((l) => (
              <tr key={l.n} className="border-t border-line"><td className="py-2 text-muted">{l.n}</td><td className="py-2 text-ink">{formatDate(l.dueDate)}</td><td className="py-2 text-right font-semibold tabular-nums text-ink">{ngn(l.total)}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted">Dates are counted from today. Your exact due dates are set on the day the money is paid out, and you can repay early to pay less interest.</p>
      </div>
    </div>
  );
}
