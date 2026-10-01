import type { Metadata } from "next";
import { BriefcaseIcon, CheckIcon, ClockIcon, WalletIcon, ZapIcon } from "@/components/icons";
import { MoneyCalculator } from "@/components/site/money-calculator";
import { Card, CardHeader, PageHeader, StatusBadge, Table, buttonPrimary, buttonSecondary } from "@/components/ui";
import { formatDate, formatNaira } from "@/lib/format";
import { account, activeLoan, loanProducts, loanSchedule } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Loans" };

const PRODUCT_ICON = { zap: <ZapIcon className="size-5" />, wallet: <WalletIcon className="size-5" />, briefcase: <BriefcaseIcon className="size-5" /> };

export default function LoansPage() {
  const paidPct = activeLoan.paidInstallments / activeLoan.installments;
  const r = 52;
  const C = 2 * Math.PI * r;

  return (
    <div className="space-y-6">
      <PageHeader title="Loans" subtitle="Fast, transparent credit when you need it." actions={<button type="button" className={buttonPrimary}>Apply for a loan</button>} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-8">
            <div className="relative size-36 shrink-0">
              <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
                <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-brand-50)" strokeWidth="12" />
                <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-brand)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${C * paidPct} ${C}`} className="transition-all" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-2xl font-bold text-ink">{activeLoan.paidInstallments}/{activeLoan.installments}</span>
                <span className="text-xs text-muted">repayments</span>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <p className="text-sm text-muted">{activeLoan.product} · {activeLoan.id}</p>
                <p className="font-display text-3xl font-bold tabular-nums text-ink">{formatNaira(activeLoan.outstanding)}</p>
                <p className="text-sm text-muted">outstanding of {formatNaira(activeLoan.principal)}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="rounded-xl bg-warning-soft px-4 py-2.5">
                  <p className="flex items-center gap-1 text-xs font-semibold text-warning"><ClockIcon className="size-3.5" /> Next repayment</p>
                  <p className="font-bold text-ink">{formatNaira(activeLoan.monthly)} · {formatDate(activeLoan.nextDue, { day: "numeric", month: "short" })}</p>
                </div>
                <div className="rounded-xl bg-canvas px-4 py-2.5">
                  <p className="text-xs font-semibold text-muted">Interest rate</p>
                  <p className="font-bold text-ink">{(activeLoan.rate * 100).toFixed(1)}% monthly</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" className={buttonPrimary}>Repay now</button>
                <button type="button" className={buttonSecondary}>Liquidate loan</button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden bg-brand-950 p-6 text-white">
          <div className="diamond-pattern absolute inset-0 opacity-70" />
          <div className="relative">
            <p className="text-sm text-white/70">Your credit limit</p>
            <p className="mt-1 font-display text-3xl font-extrabold text-gold">{formatNaira(account.creditLimit)}</p>
            <p className="mt-1 text-sm text-white/70">Pre-approved based on your account activity.</p>
            <ul className="mt-5 space-y-2 text-sm">
              {["No collateral", "Decision in minutes", "No hidden charges"].map((t) => (
                <li key={t} className="flex items-center gap-2"><CheckIcon className="size-4 text-gold" />{t}</li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-white/50">Repay on time to grow your limit.</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {loanProducts.map((p) => (
          <Card key={p.name} className="p-5">
            <span className="flex size-11 items-center justify-center rounded-xl bg-gold-100 text-gold-700">{PRODUCT_ICON[p.icon]}</span>
            <p className="mt-4 font-bold text-ink">{p.name}</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Amount</dt><dd className="font-semibold text-ink">{p.range}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Tenor</dt><dd className="font-semibold text-ink">{p.tenor}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Rate</dt><dd className="font-semibold text-ink">{p.rate}</dd></div>
            </dl>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Repayment schedule" subtitle={`Disbursed ${formatDate(activeLoan.disbursed)}`} />
        <div className="mt-3">
          <Table head={["#", "Due date", "Amount", "Status"]}>
            {loanSchedule.map((row) => (
              <tr key={row.n} className={row.status === "due" ? "bg-warning-soft/40" : ""}>
                <td className="px-5 py-3 text-muted">{row.n}</td>
                <td className="px-5 py-3 font-medium text-ink">{formatDate(row.due)}</td>
                <td className="px-5 py-3 tabular-nums">{formatNaira(row.amount)}</td>
                <td className="px-5 py-3"><StatusBadge status={row.status} /></td>
              </tr>
            ))}
          </Table>
        </div>
      </Card>

      <div>
        <h2 className="mb-4 font-display text-lg font-bold text-ink">Plan your next loan</h2>
        <MoneyCalculator initialMode="borrow" ctaHref="/dashboard/loans" />
      </div>
    </div>
  );
}
