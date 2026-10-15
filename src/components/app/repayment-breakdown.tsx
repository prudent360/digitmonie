import type { Loan, LoanInstalment, LoanPayment } from "@/db/schema";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { todayIso, toNaira } from "@/lib/loans/math";

const ngn = (kobo: number) => `₦${toNaira(kobo).toLocaleString("en-NG", { minimumFractionDigits: kobo % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
const due = (i: LoanInstalment) => i.principal + i.interest + i.lateFee;
const owed = (i: LoanInstalment) => Math.max(0, due(i) - i.paid);
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
const METHOD = { flutterwave: "Card / transfer (Flutterwave)", paystack: "Card / transfer (Paystack)", manual: "Bank transfer (recorded by staff)", test: "Test payment" } as const;

/** Staff view of a paid-out loan: every instalment split into principal, interest and late fees, and every payment received. */
export function RepaymentBreakdown({ loan, instalments, payments }: { loan: Loan; instalments: LoanInstalment[]; payments: LoanPayment[] }) {
  const today = todayIso();
  const sum = (f: (i: LoanInstalment) => number) => instalments.reduce((s, i) => s + f(i), 0);
  const outstanding = sum(owed);
  const overdue = instalments.filter((i) => i.status === "overdue").reduce((s, i) => s + owed(i), 0);
  const next = instalments.find((i) => i.status !== "paid");
  const paidOnTime = instalments.filter((i) => i.status === "paid" && i.paidAt && i.paidAt.toISOString().slice(0, 10) <= i.dueDate).length;
  const paidCount = instalments.filter((i) => i.status === "paid").length;

  const facts: [string, React.ReactNode][] = [
    ["Paid out", loan.disbursedAt ? `${ngn(loan.principal - loan.processingFee)} on ${formatDate(loan.disbursedAt.toISOString())}` : "—"],
    ["Total to repay", ngn(sum(due))],
    ["Repaid so far", ngn(sum((i) => i.paid))],
    ["Still owed", <span key="o" className={outstanding ? "text-ink" : "text-success"}>{outstanding ? ngn(outstanding) : "Nothing"}</span>],
    ["Overdue", overdue ? <span key="d" className="text-danger">{ngn(overdue)}</span> : "Nothing"],
    ["Next due", next ? `${ngn(owed(next))} on ${formatDate(next.dueDate)}` : "—"],
    ["Instalments", `${paidCount} of ${instalments.length} paid${paidCount ? ` · ${paidOnTime} on time` : ""}`],
  ];

  return (
    <div className="space-y-5">
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {facts.map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-line/60 pb-2"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold tabular-nums text-ink">{v}</dd></div>)}
      </dl>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              {["#", "Due", "Principal", "Interest", "Late fee", "Total", "Paid", "Still owed", "Status"].map((h, n) => <th key={h} className={`py-2 pr-3 font-semibold ${n >= 2 && n <= 7 ? "text-right" : ""}`}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {instalments.map((i) => {
              const late = i.status === "overdue" ? daysBetween(i.dueDate, today) : i.paidAt && i.paidAt.toISOString().slice(0, 10) > i.dueDate ? daysBetween(i.dueDate, i.paidAt.toISOString().slice(0, 10)) : 0;
              return (
                <tr key={i.n} className={`border-t border-line ${i.status === "overdue" ? "bg-danger-soft/40" : ""}`}>
                  <td className="py-2 pr-3 text-muted">{i.n}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-ink">{formatDate(i.dueDate)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{ngn(i.principal)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{ngn(i.interest)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{i.lateFee ? ngn(i.lateFee) : "—"}</td>
                  <td className="py-2 pr-3 text-right font-semibold tabular-nums text-ink">{ngn(due(i))}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{i.paid ? ngn(i.paid) : "—"}</td>
                  <td className="py-2 pr-3 text-right font-semibold tabular-nums text-ink">{owed(i) ? ngn(owed(i)) : "—"}</td>
                  <td className="whitespace-nowrap py-2">
                    <Badge tone={i.status === "paid" ? (late ? "warning" : "success") : i.status === "overdue" ? "danger" : i.status === "due" ? "warning" : "neutral"}>
                      {i.status === "paid" ? (late ? `Paid ${late}d late` : "Paid") : i.status === "overdue" ? `${late} day${late === 1 ? "" : "s"} late` : i.status === "due" ? "Due" : "Upcoming"}
                    </Badge>
                    {i.paidAt && <p className="mt-0.5 text-[11px] text-muted">{formatDate(i.paidAt.toISOString(), { day: "numeric", month: "short" })}</p>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line font-semibold text-ink">
              <td className="py-2 pr-3" colSpan={2}>Total</td>
              <td className="py-2 pr-3 text-right tabular-nums">{ngn(sum((i) => i.principal))}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{ngn(sum((i) => i.interest))}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{sum((i) => i.lateFee) ? ngn(sum((i) => i.lateFee)) : "—"}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{ngn(sum(due))}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{ngn(sum((i) => i.paid))}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{ngn(outstanding)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div>
        <h4 className="text-sm font-bold text-ink">Payments received</h4>
        {payments.length ? (
          <ul className="mt-2 divide-y divide-line text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span className="text-ink">{p.paidAt ? formatDate(p.paidAt.toISOString(), { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"} <span className="text-muted">· {METHOD[p.method]}{p.note ? ` · ${p.note}` : ""}</span></span>
                <span className="font-semibold tabular-nums text-ink">{ngn(p.amount)} <span className="ml-1 font-mono text-[11px] font-normal text-muted">{p.reference}</span></span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-muted">No payments yet.</p>}
      </div>
    </div>
  );
}
