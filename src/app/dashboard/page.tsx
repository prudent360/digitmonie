import type { Metadata } from "next";
import Link from "next/link";
import { TransactionRow } from "@/components/app/transaction-row";
import { ArrowRightIcon, CardIcon, CheckIcon, ClockIcon, IdCardIcon, LandmarkIcon, PiggyIcon, TrendUpIcon, WalletIcon } from "@/components/icons";
import { Badge, Card, CardHeader, Progress } from "@/components/ui";
import { customerActivity } from "@/lib/activity";
import { formatDate, formatNaira, formatNairaWhole } from "@/lib/format";
import { requireCustomer } from "@/lib/auth";
import { loanBalance, loanEligibility, owedOn } from "@/lib/loans/service";
import { LOAN_STATUS_LABEL, LOAN_STATUS_TONE } from "@/lib/loans/status";

export const metadata: Metadata = { title: "Home" };

const COMING_SOON = [
  { href: "/dashboard/savings", label: "Savings", text: "Save towards your goals", icon: <PiggyIcon className="size-5" /> },
  { href: "/dashboard/investments", label: "Investments", text: "Grow your money", icon: <TrendUpIcon className="size-5" /> },
  { href: "/dashboard/wallet", label: "Wallet & transfers", text: "Send money and pay bills", icon: <WalletIcon className="size-5" /> },
  { href: "/dashboard/cards", label: "Cards", text: "Shop online safely", icon: <CardIcon className="size-5" /> },
];

function greeting() {
  const hour = Number(new Date().toLocaleString("en-NG", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

const ctaClass = "inline-flex items-center gap-2 rounded-[7px] bg-gold px-5 py-3 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:bg-gold-600";

export default async function DashboardHome() {
  const user = await requireCustomer();
  const [{ openLoan, limit, blocked }, activity] = await Promise.all([loanEligibility(user), customerActivity(user.id, 6)]);
  const repaying = openLoan && ["active", "defaulted"].includes(openLoan.status);
  const balance = repaying ? await loanBalance(openLoan.id) : null;
  const nextDue = balance?.next ?? null;
  const paidCount = balance ? balance.instalments.filter((i) => i.status === "paid").length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">{greeting()}, {user.firstName} 👋</h1>
        <p className="mt-1 text-sm text-muted">{balance ? "Here's where your loan stands today." : "Here's what you can do today."}</p>
      </div>

      {user.kycTier < 3 && (
        <Link href="/dashboard/verify" className="flex items-center gap-4 rounded-[7px] border border-gold/40 bg-gold-50 p-4 transition hover:border-gold">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[7px] bg-gold text-ink"><IdCardIcon /></span>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">{user.kycTier === 0 ? "Verify your BVN to see how much you can borrow" : `Upgrade to Tier ${user.kycTier + 1} to borrow more`}</p>
            <p className="text-xs text-body">{["It takes a minute with your BVN and date of birth.", "Add your NIN and a selfie.", "Add your address and a recent utility bill."][user.kycTier]} {user.kycTier} of 3 tiers done.</p>
          </div>
          <ArrowRightIcon className="size-4 text-ink" />
        </Link>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        {/* Loan card */}
        <section className="gold-corner diamond-pattern relative overflow-hidden rounded-[7px] bg-brand p-6 text-white shadow-[0_30px_60px_-30px_rgba(1,80,200,.7)] sm:p-8">
          <div className="relative z-10">
            {balance && openLoan ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-white/75">Left to repay · Loan {openLoan.reference}</p>
                  {balance.overdueCount > 0 && <span className="rounded-[3px] bg-danger px-2 py-0.5 text-xs font-bold">{formatNairaWhole(balance.overdueAmount / 100)} overdue</span>}
                </div>
                <p className="mt-2 font-display text-4xl font-extrabold tabular-nums">{formatNaira(balance.outstanding / 100)}</p>
                <div className="mt-5 max-w-md">
                  <Progress value={balance.instalments.length ? paidCount / balance.instalments.length : 0} tone="bg-gold" track="bg-white/15" />
                  <p className="mt-2 text-xs text-white/70">{paidCount} of {balance.instalments.length} repayments made{nextDue && ` · next ${formatNairaWhole(owedOn(nextDue) / 100)} on ${formatDate(nextDue.dueDate, { day: "numeric", month: "short" })}`}</p>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/dashboard/loans" className={ctaClass}>Make a repayment <ArrowRightIcon className="size-4" /></Link>
                  {balance.settlement < balance.outstanding && <Link href="/dashboard/loans" className="rounded-[7px] px-5 py-3 text-sm font-semibold ring-1 ring-white/30 hover:bg-white/10">Pay off for {formatNairaWhole(balance.settlement / 100)}</Link>}
                </div>
              </>
            ) : openLoan ? (
              <>
                <p className="text-sm font-medium text-white/75">Your application · Loan {openLoan.reference}</p>
                <p className="mt-2 font-display text-4xl font-extrabold tabular-nums">{formatNaira(openLoan.principal / 100)}</p>
                <p className="mt-3"><Badge tone={LOAN_STATUS_TONE[openLoan.status]} dot>{LOAN_STATUS_LABEL[openLoan.status]}</Badge></p>
                <p className="mt-4 max-w-md text-sm text-white/75">{openLoan.status === "approved" ? "Your loan is approved. We're sending the money to your bank account." : "We're reviewing your application. We'll let you know as soon as there's a decision."}</p>
                <Link href="/dashboard/loans" className={`${ctaClass} mt-6`}>View application <ArrowRightIcon className="size-4" /></Link>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-white/75">You can borrow up to</p>
                <p className="mt-2 font-display text-4xl font-extrabold tabular-nums">{limit > 0 && !blocked ? formatNairaWhole(limit / 100) : "—"}</p>
                <p className="mt-3 max-w-md text-sm text-white/75">{blocked ?? "No collateral. You'll see the full cost before you accept, and the money goes straight to your bank account."}</p>
                <Link href={user.kycTier < 1 ? "/dashboard/verify" : "/dashboard/loans/apply"} className={`${ctaClass} mt-6`}>
                  {user.kycTier < 1 ? "Verify my BVN" : "Apply for a loan"} <ArrowRightIcon className="size-4" />
                </Link>
              </>
            )}
          </div>
        </section>

        <Card>
          <CardHeader title="Coming up" />
          <ul className="space-y-3 p-5">
            {nextDue ? (
              <li className="flex gap-3 rounded-[7px] bg-canvas p-3.5">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-[7px] ${nextDue.status === "overdue" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}><ClockIcon className="size-4" /></span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">{nextDue.status === "overdue" ? "Overdue repayment" : "Next repayment"}</p>
                  <p className="text-xs text-muted">{formatNaira(owedOn(nextDue) / 100)} · {formatDate(nextDue.dueDate)}</p>
                </div>
              </li>
            ) : (
              <li className="flex gap-3 rounded-[7px] bg-canvas p-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[7px] bg-success-soft text-success"><CheckIcon className="size-4" /></span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">Nothing due</p>
                  <p className="text-xs text-muted">You have no repayments coming up.</p>
                </div>
              </li>
            )}
            <li className="flex gap-3 rounded-[7px] bg-canvas p-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[7px] bg-brand-50 text-brand"><LandmarkIcon className="size-4" /></span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink">Repay early, pay less</p>
                <p className="text-xs text-muted">Pay off your loan any time and skip the interest for the months you don&apos;t use.</p>
              </div>
            </li>
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Recent activity" action={activity.length ? <Link href="/dashboard/transactions" className="text-sm font-semibold text-brand">See all</Link> : undefined} />
          {activity.length ? (
            <ul className="mt-2 divide-y divide-line pb-2">{activity.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}</ul>
          ) : (
            <p className="px-5 pb-10 pt-8 text-center text-sm text-muted">No activity yet. Loans paid to you and your repayments will show here.</p>
          )}
        </Card>

        <Card>
          <CardHeader title="Coming soon" subtitle="We're building these now" />
          <ul className="grid grid-cols-2 gap-3 p-5">
            {COMING_SOON.map((c) => (
              <li key={c.href}>
                <Link href={c.href} className="group relative flex h-full flex-col gap-2 rounded-[7px] border border-line p-3.5 transition hover:border-brand-200">
                  <span className="flex size-9 items-center justify-center rounded-[7px] bg-brand-50 text-brand">{c.icon}</span>
                  <span className="text-sm font-semibold text-ink">{c.label}</span>
                  <span className="text-xs text-muted">{c.text}</span>
                  <span className="absolute right-2.5 top-2.5 rounded-[3px] bg-gold-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-gold-700">Soon</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
