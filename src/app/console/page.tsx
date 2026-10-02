import type { Metadata } from "next";
import Link from "next/link";
import { AreaChart, GroupedBars } from "@/components/charts/charts";
import { AlertIcon, ChartIcon, LandmarkIcon, TrendUpIcon, UsersIcon } from "@/components/icons";
import { Avatar, Badge, Card, CardHeader, PageHeader, StatTile, StatusBadge } from "@/components/ui";
import { formatCompactNaira, formatDate, formatNaira, formatNumber } from "@/lib/format";
import { customerStats, monthlySeries, portfolio } from "@/lib/reports";
import { payoutsNeedingAttention, recentPayouts, recentRepayments } from "@/lib/money";
import { staffLoanQueue } from "@/lib/loans/queries";
import { listAudit } from "@/lib/audit-queries";
import { listKycSubmissions } from "@/lib/kyc/queries";
import { can, requirePermission } from "@/lib/auth";

export const metadata: Metadata = { title: "Console" };

export default async function ConsoleOverview({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const user = await requirePermission("console.access");
  const showAudit = can(user, "audit.view");
  const kycPending = can(user, "kyc.review") ? await listKycSubmissions("pending_review", 4) : null;
  const audit = showAudit ? (await listAudit({ limit: 5 })).rows : [];
  const seesMoney = can(user, "transactions.view");
  const attention = seesMoney ? await payoutsNeedingAttention() : [];
  const movements = seesMoney
    ? [...(await recentPayouts(5)).map((r) => ({ id: `o${r.p.id}`, ref: r.p.reference, who: `${r.firstName} ${r.lastName}`, what: "Loan payout", amount: -r.p.amount, at: r.p.createdAt, status: r.p.status === "processing" ? "pending" : r.p.status })),
       ...(await recentRepayments(5)).map((r) => ({ id: `i${r.p.id}`, ref: r.p.reference, who: `${r.firstName} ${r.lastName}`, what: "Repayment", amount: r.p.amount, at: r.p.paidAt ?? r.p.createdAt, status: "successful" }))]
        .sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 6)
    : [];
  const pendingLoans = can(user, "loans.review") ? (await staffLoanQueue("review")).rows.slice(0, 5) : null;
  const [book, series, people] = await Promise.all([portfolio(), monthlySeries(12), customerStats(30)]);
  const thisMonth = series.at(-1)!;
  const lastMonth = series.at(-2)!;
  const change = (now: number, before: number) => (before ? (now - before) / before : undefined);

  return (
    <div className="space-y-6">
      <PageHeader title="Operations overview" subtitle={`Signed in as ${user.role.name} · ${formatDate(new Date().toISOString(), { weekday: "long", day: "numeric", month: "long" })}`} actions={<Badge tone="success" dot>All systems operational</Badge>} />

      {denied && (
        <p role="status" className="rounded-[5px] border border-warning/30 bg-warning-soft px-4 py-3 text-sm font-medium text-warning">
          Your role ({user.role.name}) doesn&apos;t have access to that page. Ask an administrator if you need it.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Loan book (principal owed)" value={formatCompactNaira(book.principal / 100)} hint={`${formatNumber(book.activeLoans)} active loan${book.activeLoans === 1 ? "" : "s"}`} icon={<LandmarkIcon className="size-5" />} />
        <StatTile label="Collected this month" value={formatCompactNaira(thisMonth.collected / 100)} change={change(thisMonth.collected, lastMonth.collected)} icon={<TrendUpIcon className="size-5" />} />
        <StatTile label="Customers" value={formatNumber(people.total)} hint={`${formatNumber(people.fresh)} joined in the last 30 days · ${people.total ? Math.round((people.verified / people.total) * 100) : 0}% BVN verified`} icon={<UsersIcon className="size-5" />} />
        <StatTile label="Portfolio at risk (30+ days)" value={`${(book.par30Ratio * 100).toFixed(1)}%`} hint={`${formatCompactNaira(book.par30 / 100)} of principal is over 30 days late`} icon={<ChartIcon className="size-5" />} />
      </div>

      {attention.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-[5px] border border-danger/20 bg-danger-soft p-4">
          <span className="flex size-10 items-center justify-center rounded-[5px] bg-danger text-white"><AlertIcon /></span>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">{attention.length} payout{attention.length > 1 ? "s" : ""} need attention</p>
            <p className="text-xs text-body">Transfers that failed or have been processing for over 15 minutes.</p>
          </div>
          <Link href="/console/transactions" className="rounded-[5px] bg-white px-4 py-2 text-sm font-bold text-danger ring-1 ring-danger/20">Review now</Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Collected vs disbursed" subtitle="Last 12 months" action={can(user, "reports.view") ? <Link href="/console/reports" className="text-sm font-semibold text-brand">Reports</Link> : undefined} />
          <div className="px-3 pb-3 pt-4"><GroupedBars data={series.map((m) => ({ label: m.label, inflow: m.collected / 100, outflow: m.disbursed / 100 }))} labels={["Collected", "Disbursed"]} /></div>
        </Card>
        <Card>
          <CardHeader title="New customers" subtitle="Sign-ups per month" />
          <div className="px-3 pb-3 pt-4"><AreaChart data={series.map((m) => ({ label: m.label, value: m.newCustomers }))} valueFormat="count" /></div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {kycPending && (
          <Card>
            <CardHeader title="KYC queue" subtitle={`${kycPending.length ? "Oldest first" : "Nothing waiting"}`} action={<Link href="/console/kyc" className="text-sm font-semibold text-brand">Open</Link>} />
            <ul className="divide-y divide-line pb-2 pt-2">
              {kycPending.map(({ s: k, firstName, lastName }) => (
                <li key={k.id}>
                  <Link href={`/console/kyc/${k.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-canvas/60">
                    <Avatar name={`${firstName} ${lastName}`} />
                    <div className="flex-1"><p className="text-sm font-semibold text-ink">{firstName} {lastName}</p><p className="text-xs text-muted">Tier {k.tier}{k.checks.faceScore !== undefined ? ` · ${k.checks.faceScore}% face match` : ""}</p></div>
                    <Badge tone="warning" dot>review</Badge>
                  </Link>
                </li>
              ))}
              {!kycPending.length && <li className="px-5 py-6 text-sm text-muted">No customers waiting for review.</li>}
            </ul>
          </Card>
        )}
        {pendingLoans && (
          <Card>
            <CardHeader title="Loans to review" subtitle={pendingLoans.length ? "Oldest first" : "Nothing waiting"} action={<Link href="/console/loans" className="text-sm font-semibold text-brand">Open</Link>} />
            <ul className="divide-y divide-line pb-2 pt-2">
              {pendingLoans.map(({ loan, productName, firstName, lastName }) => (
                <li key={loan.id}>
                  <Link href={`/console/loans/${loan.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-canvas/60">
                    <span className="flex size-9 items-center justify-center rounded-full bg-gold-100 text-gold-700"><LandmarkIcon className="size-4" /></span>
                    <div className="flex-1"><p className="text-sm font-semibold text-ink">{firstName} {lastName}</p><p className="text-xs text-muted">{productName}{loan.score ? ` · score ${loan.score.score}` : ""}</p></div>
                    <p className="text-sm font-bold tabular-nums text-ink">{formatCompactNaira(loan.principal / 100)}</p>
                  </Link>
                </li>
              ))}
              {!pendingLoans.length && <li className="px-5 py-6 text-sm text-muted">No applications waiting.</li>}
            </ul>
          </Card>
        )}
        {showAudit && (
          <Card>
            <CardHeader title="Audit trail" subtitle="Recent staff and security actions" action={<Link href="/console/audit" className="text-sm font-semibold text-brand">Open</Link>} />
            {audit.length ? (
              <ol className="space-y-4 p-5">
                {audit.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
                    <div><p className="text-sm text-ink"><b>{a.actorName ?? "System"}</b> {a.summary}</p><p className="text-xs text-muted">{formatDate(a.createdAt.toISOString(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p></div>
                  </li>
                ))}
              </ol>
            ) : <p className="p-5 text-sm text-muted">Nothing recorded yet.</p>}
          </Card>
        )}
      </div>

      {seesMoney && (
        <Card>
          <CardHeader title="Latest money movements" action={<Link href="/console/transactions" className="text-sm font-semibold text-brand">Open Money</Link>} />
          <ul className="divide-y divide-line pt-2">
            {movements.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                <span className="w-32 font-mono text-xs text-muted">{t.ref}</span>
                <span className="flex-1 font-semibold text-ink">{t.who}</span>
                <span className="text-muted">{t.what}</span>
                <span className={`w-36 text-right font-bold tabular-nums ${t.amount > 0 ? "text-success" : "text-ink"}`}>{t.amount > 0 ? "+" : "−"}{formatNaira(Math.abs(t.amount) / 100)}</span>
                <span className="w-28 text-right"><StatusBadge status={t.status} /></span>
              </li>
            ))}
            {!movements.length && <li className="px-5 py-6 text-sm text-muted">No payouts or repayments yet.</li>}
          </ul>
        </Card>
      )}
    </div>
  );
}
