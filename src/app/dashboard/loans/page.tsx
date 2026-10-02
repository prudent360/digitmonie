import type { Metadata } from "next";
import Link from "next/link";
import { cancelApplication, repayLoan } from "@/app/actions/loans";
import { CancelLoanButton, RepayForm } from "@/components/app/loan-repay";
import { AlertIcon, CheckIcon, ClockIcon, LandmarkIcon } from "@/components/icons";
import { Badge, Card, CardHeader, PageHeader, StatusBadge, Table, buttonPrimary } from "@/components/ui";
import { requireCustomer } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { bpsToPercent, toNaira } from "@/lib/loans/math";
import { customerLoans, loanPaymentsFor } from "@/lib/loans/queries";
import { loanPayouts } from "@/lib/loans/payouts";
import { loanBalance, loanEligibility, owedOn, refreshInstalments } from "@/lib/loans/service";
import { LOAN_STATUS_LABEL, LOAN_STATUS_TONE } from "@/lib/loans/status";

export const metadata: Metadata = { title: "Loans" };

const ngn = (kobo: number) => `₦${toNaira(kobo).toLocaleString("en-NG", { minimumFractionDigits: kobo % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

export default async function LoansPage({ searchParams }: { searchParams: Promise<{ applied?: string; paid?: string; payment?: string }> }) {
  const user = await requireCustomer();
  await refreshInstalments();
  const { applied, paid, payment } = await searchParams;
  const { limit, products, openLoan, blocked, history } = await loanEligibility(user);
  const all = await customerLoans(user.id);
  const open = openLoan ? all.find((l) => l.loan.id === openLoan.id) ?? null : null;
  const repayable = open && ["active", "defaulted"].includes(open.loan.status);
  const balance = repayable ? await loanBalance(open.loan.id) : null;
  const payments = repayable ? await loanPaymentsFor(open.loan.id) : [];
  const past = all.filter((l) => l.loan.id !== open?.loan.id);
  const sending = open?.loan.status === "approved" && (await loanPayouts(open.loan.id)).some((p) => p.status === "processing");

  return (
    <div className="space-y-6">
      <PageHeader title="Loans" subtitle="Fast, transparent credit. No hidden charges." actions={!blocked ? <Link href="/dashboard/loans/apply" className={buttonPrimary}>Apply for a loan</Link> : undefined} />

      {applied && <p className="rounded-[5px] bg-success-soft px-4 py-3 text-sm font-medium text-success">Application received. You&apos;ll find its status below.</p>}
      {paid && <p className="rounded-[5px] bg-success-soft px-4 py-3 text-sm font-medium text-success">Payment received. Thank you!</p>}
      {payment === "pending" && <p className="rounded-[5px] bg-warning-soft px-4 py-3 text-sm font-medium text-warning">We&apos;re still confirming your payment. It will show here as soon as Paystack confirms it.</p>}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {open ? (
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted">{open.productName} · {open.loan.reference}</p>
                <p className="font-display text-3xl font-bold tabular-nums text-ink">{ngn(balance ? balance.outstanding : open.loan.principal)}</p>
                <p className="text-sm text-muted">{balance ? `left to repay of ${ngn(open.loan.totalRepayable)}` : `requested over ${open.loan.tenorMonths} month${open.loan.tenorMonths > 1 ? "s" : ""}`}</p>
              </div>
              <Badge tone={LOAN_STATUS_TONE[open.loan.status]} dot>{LOAN_STATUS_LABEL[open.loan.status]}</Badge>
            </div>

            {balance ? (
              <>
                <div className="mt-5 h-2.5 overflow-hidden rounded-[5px] bg-brand-50"><div className="grow-x h-full bg-brand" style={{ width: `${Math.round((1 - balance.outstanding / open.loan.totalRepayable) * 100)}%` }} /></div>
                {balance.overdueCount > 0 ? (
                  <p className="mt-5 flex items-start gap-2 rounded-[5px] bg-danger-soft px-4 py-3 text-sm text-danger"><AlertIcon className="mt-0.5 size-4 shrink-0" /><span><b>{ngn(balance.overdueAmount)} is overdue.</b> Please pay today. Late repayments are reported to credit bureaus and affect your ability to borrow.</span></p>
                ) : balance.next && (
                  <p className="mt-5 flex items-center gap-2 rounded-[5px] bg-warning-soft px-4 py-3 text-sm text-warning"><ClockIcon className="size-4" /> Next repayment: <b>{ngn(owedOn(balance.next))}</b> on {formatDate(balance.next.dueDate)}</p>
                )}
              </>
            ) : (
              <div className="mt-6 space-y-3">
                {[
                  { label: "Application received", done: true },
                  { label: "Credit review", done: ["reviewed", "approved"].includes(open.loan.status) },
                  { label: "Approved", done: open.loan.status === "approved" },
                  { label: sending ? `Sending to ${open.loan.payoutBank} ••${open.loan.payoutAccount.slice(-4)} now…` : `Money sent to ${open.loan.payoutBank} ••${open.loan.payoutAccount.slice(-4)}`, done: false },
                ].map((s) => (
                  <p key={s.label} className="flex items-center gap-3 text-sm"><span className={`flex size-6 items-center justify-center rounded-full ${s.done ? "bg-success text-white" : "bg-canvas text-muted"}`}>{s.done ? <CheckIcon className="size-3.5" /> : <ClockIcon className="size-3.5" />}</span><span className={s.done ? "font-semibold text-ink" : "text-muted"}>{s.label}</span></p>
                ))}
                {!sending && <div className="pt-2"><CancelLoanButton action={cancelApplication} loanId={open.loan.id} /></div>}
              </div>
            )}
          </Card>
        ) : (
          <Card className="flex flex-col items-start justify-center p-6">
            <span className="flex size-12 items-center justify-center rounded-[5px] bg-gold-100 text-gold-700"><LandmarkIcon /></span>
            <h2 className="mt-4 font-display text-xl font-bold text-ink">No active loan</h2>
            <p className="mt-1 text-sm text-body">{blocked ?? "Choose an amount and see exactly what you'll repay before you apply."}</p>
            {blocked && user.kycTier < 1 ? <Link href="/dashboard/verify" className={`${buttonPrimary} mt-5`}>Verify your BVN</Link> : !blocked && <Link href="/dashboard/loans/apply" className={`${buttonPrimary} mt-5`}>Apply now</Link>}
          </Card>
        )}

        {balance && open ? (
          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Make a repayment</h2>
            <div className="mt-4">
              <RepayForm action={repayLoan} loanId={open.loan.id} options={[
                ...(balance.overdueAmount > 0 ? [{ label: "Overdue amount", amount: balance.overdueAmount }] : balance.next ? [{ label: "Next instalment", amount: owedOn(balance.next) }] : []),
                { label: "Pay off the whole loan", amount: balance.outstanding },
              ].filter((o, i, a) => a.findIndex((x) => x.amount === o.amount) === i)} />
            </div>
          </Card>
        ) : (
          <Card className="relative overflow-hidden bg-brand-950 p-6 text-white">
            <div className="diamond-pattern absolute inset-0 opacity-70" />
            <div className="relative">
              <p className="text-sm text-white/70">Your loan limit</p>
              <p className="mt-1 font-display text-3xl font-extrabold text-gold">{ngn(limit)}</p>
              <p className="mt-2 text-sm text-white/70">{user.kycTier < 3 ? `Verify to Tier ${user.kycTier + 1} and repay on time to grow it.` : "Repay on time to grow it."}</p>
              {history.repaidOnTime > 0 && <p className="mt-3 text-xs text-white/60">{history.repaidOnTime} loan{history.repaidOnTime > 1 ? "s" : ""} repaid on time 🎉</p>}
            </div>
          </Card>
        )}
      </div>

      {balance && open && (
        <Card>
          <CardHeader title="Repayment schedule" subtitle={`${bpsToPercent(open.loan.monthlyRateBps)} a month · paid out ${open.loan.disbursedAt ? formatDate(open.loan.disbursedAt.toISOString()) : ""}`} />
          <div className="mt-3">
            <Table head={["#", "Due", "Amount", "Late fee", "Paid", "Status"]}>
              {balance.instalments.map((i) => (
                <tr key={i.id} className={i.status === "overdue" ? "bg-danger-soft/40" : i.status === "due" ? "bg-warning-soft/40" : ""}>
                  <td className="px-5 py-3 text-muted">{i.n}</td>
                  <td className="px-5 py-3 font-medium text-ink">{formatDate(i.dueDate)}</td>
                  <td className="px-5 py-3 tabular-nums">{ngn(i.principal + i.interest)}</td>
                  <td className="px-5 py-3 tabular-nums">{i.lateFee ? ngn(i.lateFee) : "—"}</td>
                  <td className="px-5 py-3 tabular-nums">{i.paid ? ngn(i.paid) : "—"}</td>
                  <td className="px-5 py-3"><StatusBadge status={i.status} /></td>
                </tr>
              ))}
            </Table>
          </div>
          {payments.length > 0 && <p className="border-t border-line px-5 py-3 text-xs text-muted">{payments.length} payment{payments.length > 1 ? "s" : ""} received · last {formatDate(payments[0].paidAt!.toISOString(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>}
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {products.map((p) => (
          <Card key={p.id} className="p-5">
            <div className="flex items-center justify-between"><p className="font-bold text-ink">{p.name}</p>{p.minKycTier > user.kycTier && <Badge>Tier {p.minKycTier}</Badge>}</div>
            <p className="mt-1 text-sm text-body">{p.description}</p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Amount</dt><dd className="font-semibold text-ink">{ngn(p.minAmount)} – {ngn(p.maxAmount)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Repay over</dt><dd className="font-semibold text-ink">{p.tenors[0]}–{p.tenors.at(-1)} months</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Interest</dt><dd className="font-semibold text-ink">{bpsToPercent(p.monthlyRateBps)} a month</dd></div>
            </dl>
          </Card>
        ))}
      </div>

      {past.length > 0 && (
        <Card>
          <CardHeader title="Loan history" />
          <div className="mt-3">
            <Table head={["Loan", "Amount", "Applied", "Status", ""]}>
              {past.map(({ loan, productName }) => (
                <tr key={loan.id}>
                  <td className="px-5 py-3"><p className="font-semibold text-ink">{productName}</p><p className="font-mono text-xs text-muted">{loan.reference}</p></td>
                  <td className="px-5 py-3 tabular-nums">{ngn(loan.principal)}</td>
                  <td className="px-5 py-3 text-body">{formatDate(loan.createdAt.toISOString())}</td>
                  <td className="px-5 py-3"><Badge tone={LOAN_STATUS_TONE[loan.status]} dot>{LOAN_STATUS_LABEL[loan.status]}</Badge></td>
                  <td className="max-w-xs px-5 py-3 text-xs text-muted">{loan.declineReason}</td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
