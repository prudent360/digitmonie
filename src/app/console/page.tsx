import type { Metadata } from "next";
import Link from "next/link";
import { AreaChart, GroupedBars } from "@/components/charts/charts";
import { AlertIcon, ChartIcon, IdCardIcon, LandmarkIcon, TrendUpIcon, UsersIcon } from "@/components/icons";
import { Avatar, Badge, Card, CardHeader, PageHeader, StatTile, StatusBadge } from "@/components/ui";
import { formatCompactNaira, formatDate, formatNaira, formatNumber } from "@/lib/format";
import { consoleKpis, disbursements, kycQueue, loanApplications, platformTransactions, signups } from "@/lib/mock-data";
import { listAudit } from "@/lib/audit-queries";
import { can, requirePermission } from "@/lib/auth";

export const metadata: Metadata = { title: "Console" };

export default async function ConsoleOverview({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { denied } = await searchParams;
  const user = await requirePermission("console.access");
  const showAudit = can(user, "audit.view");
  const audit = showAudit ? (await listAudit({ limit: 5 })).rows : [];
  const flagged = platformTransactions.filter((t) => t.flagged);
  const pendingLoans = loanApplications.filter((l) => l.status === "pending");

  return (
    <div className="space-y-6">
      <PageHeader title="Operations overview" subtitle={`Signed in as ${user.role.name} · ${formatDate(new Date().toISOString(), { weekday: "long", day: "numeric", month: "long" })}`} actions={<Badge tone="success" dot>All systems operational</Badge>} />

      {denied && (
        <p role="status" className="rounded-[5px] border border-warning/30 bg-warning-soft px-4 py-3 text-sm font-medium text-warning">
          Your role ({user.role.name}) doesn&apos;t have access to that page. Ask an administrator if you need it.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Assets under management" value={formatCompactNaira(consoleKpis.aum)} change={consoleKpis.aumChange} icon={<TrendUpIcon className="size-5" />} />
        <StatTile label="Loan book" value={formatCompactNaira(consoleKpis.loanBook)} change={consoleKpis.loanBookChange} icon={<LandmarkIcon className="size-5" />} />
        <StatTile label="Active customers" value={formatNumber(consoleKpis.activeUsers)} change={consoleKpis.usersChange} icon={<UsersIcon className="size-5" />} />
        <StatTile label="NPL ratio" value={`${(consoleKpis.nplRatio * 100).toFixed(1)}%`} hint="▼ 0.4pt vs last month · target < 5%" icon={<ChartIcon className="size-5" />} />
      </div>

      {flagged.length > 0 && can(user, "transactions.view") && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-danger/20 bg-danger-soft p-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-danger text-white"><AlertIcon /></span>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">{flagged.length} transactions flagged for AML review</p>
            <p className="text-xs text-body">Large outbound transfers held pending compliance checks.</p>
          </div>
          <Link href="/console/transactions" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-danger ring-1 ring-danger/20">Review now</Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Repayments vs disbursements" subtitle="Last 6 months" />
          <div className="px-3 pb-3 pt-4"><GroupedBars data={disbursements} labels={["Repayments", "Disbursed"]} /></div>
        </Card>
        <Card>
          <CardHeader title="New sign-ups" subtitle="Verified accounts per month" />
          <div className="px-3 pb-3 pt-4"><AreaChart data={signups} valueFormat="count" /></div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="KYC queue" subtitle={`${kycQueue.length} awaiting review`} action={<Link href="/console/kyc" className="text-sm font-semibold text-brand">Open</Link>} />
          <ul className="divide-y divide-line pb-2 pt-2">
            {kycQueue.slice(0, 4).map((k) => (
              <li key={k.id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={k.name} />
                <div className="flex-1"><p className="text-sm font-semibold text-ink">{k.name}</p><p className="text-xs text-muted">{k.requested} · {Math.round(k.match * 100)}% face match</p></div>
                <Badge tone={k.risk === "low" ? "success" : k.risk === "medium" ? "warning" : "danger"} dot>{k.risk}</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Pending loans" subtitle={`${pendingLoans.length} need a decision`} action={<Link href="/console/loans" className="text-sm font-semibold text-brand">Open</Link>} />
          <ul className="divide-y divide-line pb-2 pt-2">
            {pendingLoans.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-gold-100 text-gold-700"><LandmarkIcon className="size-4" /></span>
                <div className="flex-1"><p className="text-sm font-semibold text-ink">{l.name}</p><p className="text-xs text-muted">{l.product} · score {l.score}</p></div>
                <p className="text-sm font-bold tabular-nums text-ink">{formatCompactNaira(l.amount)}</p>
              </li>
            ))}
          </ul>
        </Card>
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

      <Card>
        <CardHeader title="Live transactions" action={<Link href="/console/transactions" className="text-sm font-semibold text-brand">All transactions</Link>} />
        <ul className="divide-y divide-line pt-2">
          {platformTransactions.slice(0, 5).map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <span className="w-32 font-mono text-xs text-muted">{t.reference}</span>
              <span className="flex-1 font-semibold text-ink">{t.customer}</span>
              <span className="text-muted">{t.channel}</span>
              <span className={`w-36 text-right font-bold tabular-nums ${t.type === "credit" ? "text-success" : "text-ink"}`}>{t.type === "credit" ? "+" : "−"}{formatNaira(t.amount)}</span>
              <span className="w-28 text-right"><StatusBadge status={t.status} /></span>
            </li>
          ))}
        </ul>
      </Card>
      <p className="flex items-center gap-2 text-xs text-muted"><IdCardIcon className="size-4" /> Figures shown are sample data.</p>
    </div>
  );
}
