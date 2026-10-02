import type { Metadata } from "next";
import Link from "next/link";
import { BalanceCard } from "@/components/app/balance-card";
import { TransactionRow } from "@/components/app/transaction-row";
import { AreaChart, Donut, GroupedBars } from "@/components/charts/charts";
import { ArrowRightIcon, BoltIcon, ClockIcon, GiftIcon, IdCardIcon, LandmarkIcon, PiggyIcon, PlusIcon, SendIcon, TrendUpIcon } from "@/components/icons";
import { Badge, Card, CardHeader, Progress } from "@/components/ui";
import { formatDate, formatNaira, formatNairaWhole } from "@/lib/format";
import { account, allocation, cashflow, investments, netWorthHistory, savingsPlans, transactions } from "@/lib/mock-data";
import { requireCustomer } from "@/lib/auth";
import { loanBalance, loanEligibility, owedOn } from "@/lib/loans/service";

export const metadata: Metadata = { title: "Home" };

const QUICK_ACTIONS = [
  { href: "/dashboard/wallet#fund", label: "Add money", icon: <PlusIcon className="size-5" /> },
  { href: "/dashboard/wallet#send", label: "Send", icon: <SendIcon className="size-5" /> },
  { href: "/dashboard/wallet#bills", label: "Pay bills", icon: <BoltIcon className="size-5" /> },
  { href: "/dashboard/savings", label: "Save", icon: <PiggyIcon className="size-5" /> },
  { href: "/dashboard/investments", label: "Invest", icon: <TrendUpIcon className="size-5" /> },
  { href: "/dashboard/loans", label: "Borrow", icon: <LandmarkIcon className="size-5" /> },
];

function greeting() {
  const hour = Number(new Date().toLocaleString("en-NG", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function DashboardHome() {
  const user = await requireCustomer();
  const firstName = user.firstName;
  const { openLoan, limit } = await loanEligibility(user);
  const balance = openLoan?.status === "active" ? await loanBalance(openLoan.id) : null;
  const nextDue = balance?.next ?? null;
  const netWorth = account.walletBalance + account.savingsBalance + account.investmentBalance;
  const maturing = investments.find((i) => i.status === "maturing");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{greeting()}, {firstName} 👋</h1>
          <p className="mt-1 text-sm text-muted">Here&apos;s where your money stands today.</p>
        </div>
        <Badge tone="gold">⭐ {account.points.toLocaleString()} DigitPoints</Badge>
      </div>

      {user.kycTier < 3 && (
        <Link href="/dashboard/verify" className="flex items-center gap-4 rounded-[7px] border border-gold/40 bg-gold-50 p-4 transition hover:border-gold">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[7px] bg-gold text-ink"><IdCardIcon /></span>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">{user.kycTier === 0 ? "Verify your BVN to start using your account" : `Upgrade to Tier ${user.kycTier + 1} for higher limits`}</p>
            <p className="text-xs text-body">{["It takes a minute with your BVN and date of birth.", "Add your NIN and a selfie.", "Add your address and a recent utility bill."][user.kycTier]} {user.kycTier} of 3 tiers done.</p>
          </div>
          <ArrowRightIcon className="size-4 text-ink" />
        </Link>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          <BalanceCard total={netWorth} wallet={account.walletBalance} accountNumber={account.accountNumber} bank={account.bank} change={0.124} />

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.label} href={a.href} className="group flex flex-col items-center gap-2 rounded-[7px] border border-line bg-white py-4 text-xs font-semibold text-body transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand hover:shadow-[0_14px_30px_-18px_rgba(1,80,200,.6)]">
                <span className="flex size-10 items-center justify-center rounded-[7px] bg-brand-50 text-brand transition group-hover:bg-brand group-hover:text-white">{a.icon}</span>
                {a.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
          {[
            { label: "Savings", value: account.savingsBalance, note: "+₦18,240 interest this month", icon: <PiggyIcon className="size-5" />, href: "/dashboard/savings" },
            { label: "Investments", value: account.investmentBalance, note: "Avg. 19.6% p.a. across 4 assets", icon: <TrendUpIcon className="size-5" />, href: "/dashboard/investments" },
            { label: balance ? "Loan balance" : "Loan limit", value: balance ? balance.outstanding / 100 : limit / 100, note: balance ? (balance.overdueCount ? `${formatNairaWhole(balance.overdueAmount / 100)} overdue` : nextDue ? `Next: ${formatNairaWhole(owedOn(nextDue) / 100)} on ${formatDate(nextDue.dueDate, { day: "numeric", month: "short" })}` : "") : openLoan ? "Application in progress" : "Available to borrow", icon: <LandmarkIcon className="size-5" />, href: "/dashboard/loans" },
          ].map((s) => (
            <Link key={s.label} href={s.href} className="group flex items-center gap-4 rounded-[7px] border border-line bg-white p-4 transition hover:border-brand-200">
              <span className="flex size-11 items-center justify-center rounded-[7px] bg-brand-50 text-brand">{s.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted">{s.label}</p>
                <p className="font-display text-lg font-bold tabular-nums text-ink">{formatNaira(s.value)}</p>
                <p className="truncate text-xs text-muted">{s.note}</p>
              </div>
              <ArrowRightIcon className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Net worth" subtitle="Wallet + savings + investments, last 12 months" action={<Badge tone="success">▲ 77.7%</Badge>} />
          <div className="px-3 pb-3 pt-4"><AreaChart data={netWorthHistory} /></div>
        </Card>
        <Card>
          <CardHeader title="Where your money is" subtitle="Savings & investments" />
          <div className="p-5"><Donut data={allocation} centerLabel="Total" /></div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Recent transactions" action={<Link href="/dashboard/transactions" className="text-sm font-semibold text-brand">See all</Link>} />
          <ul className="mt-2 divide-y divide-line pb-2">
            {transactions.slice(0, 6).map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Coming up" />
            <ul className="space-y-3 p-5">
              {nextDue && (
                <li className="flex gap-3 rounded-[7px] bg-canvas p-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[7px] bg-warning-soft text-warning"><ClockIcon className="size-4" /></span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">Loan repayment</p>
                    <p className="text-xs text-muted">{formatNaira(owedOn(nextDue) / 100)} · {formatDate(nextDue.dueDate)}</p>
                  </div>
                </li>
              )}
              {maturing && (
                <li className="flex gap-3 rounded-[7px] bg-canvas p-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[7px] bg-gold-100 text-gold-700"><TrendUpIcon className="size-4" /></span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">{maturing.name} matures</p>
                    <p className="text-xs text-muted">{formatNaira(maturing.current)} · {formatDate(maturing.maturity!)}</p>
                  </div>
                </li>
              )}
              <li className="space-y-2 rounded-[7px] bg-canvas p-3.5">
                <div className="flex justify-between text-sm"><span className="font-semibold text-ink">{savingsPlans[0].name}</span><span className="text-xs text-muted">{Math.round((savingsPlans[0].saved / savingsPlans[0].goal) * 100)}%</span></div>
                <Progress value={savingsPlans[0].saved / savingsPlans[0].goal} />
              </li>
            </ul>
          </Card>

          <div className="relative overflow-hidden rounded-[7px] bg-brand-950 p-5 text-white">
            <div className="diamond-pattern absolute inset-0 opacity-70" />
            <div className="relative">
              <span className="flex size-10 items-center justify-center rounded-[7px] bg-gold text-ink"><GiftIcon /></span>
              <p className="mt-4 font-display text-lg font-bold">Invite friends, earn ₦2,000</p>
              <p className="mt-1 text-sm text-white/70">For every friend who saves their first ₦10,000.</p>
              <button type="button" className="mt-4 rounded-[7px] bg-white px-4 py-2 text-sm font-bold text-brand">Share invite link</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Cash flow" subtitle="Money in vs money out, last 6 months" />
          <div className="px-3 pb-3 pt-4"><GroupedBars data={cashflow} labels={["Money in", "Money out"]} /></div>
        </Card>
        <Card className="p-5">
          <h2 className="text-[15px] font-bold text-ink">September summary</h2>
          <dl className="mt-5 space-y-4">
            {[
              { label: "Money in", value: cashflow.at(-1)!.inflow, tone: "text-success" },
              { label: "Money out", value: cashflow.at(-1)!.outflow, tone: "text-ink" },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <dt className="text-sm text-muted">{row.label}</dt>
                <dd className={`font-display text-lg font-bold tabular-nums ${row.tone}`}>{formatNairaWhole(row.value)}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 rounded-[7px] bg-brand-50 p-4">
            <p className="text-xs font-semibold text-brand">You kept</p>
            <p className="font-display text-2xl font-extrabold tabular-nums text-brand">{formatNairaWhole(cashflow.at(-1)!.inflow - cashflow.at(-1)!.outflow)}</p>
            <p className="mt-1 text-xs text-body">{Math.round((1 - cashflow.at(-1)!.outflow / cashflow.at(-1)!.inflow) * 100)}% of your income. Move it to savings to earn 14% p.a.</p>
          </div>
          <Link href="/dashboard/savings" className="mt-4 flex items-center justify-center gap-2 rounded-[7px] bg-brand py-2.5 text-sm font-bold text-white hover:bg-brand-600">Save the difference <ArrowRightIcon className="size-4" /></Link>
        </Card>
      </div>
    </div>
  );
}
