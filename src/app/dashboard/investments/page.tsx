import type { Metadata } from "next";
import { AreaChart, Donut } from "@/components/charts/charts";
import { ShieldIcon, TrendUpIcon } from "@/components/icons";
import { Badge, Card, CardHeader, PageHeader, Progress, StatTile, StatusBadge, Table, buttonPrimary } from "@/components/ui";
import { formatDate, formatNaira, formatNairaWhole } from "@/lib/format";
import { allocation, investmentProducts, investments, netWorthHistory } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Investments" };

const RISK_TONE = { "Very low": "success", Low: "success", Medium: "warning" } as const;

export default function InvestmentsPage() {
  const principal = investments.reduce((s, i) => s + i.principal, 0);
  const current = investments.reduce((s, i) => s + i.current, 0);
  const portfolio = netWorthHistory.map((p) => ({ label: p.label, value: Math.round(p.value * 0.63) }));

  return (
    <div className="space-y-6">
      <PageHeader title="Investments" subtitle="Vetted Naira products with clear, upfront returns." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Portfolio value" value={formatNaira(current)} change={0.042} icon={<TrendUpIcon className="size-5" />} />
        <StatTile label="Total returns" value={`+${formatNaira(current - principal)}`} hint={`${(((current - principal) / principal) * 100).toFixed(1)}% on ${formatNairaWhole(principal)} invested`} />
        <StatTile label="Average yield" value="19.6% p.a." hint="Weighted by amount invested" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Portfolio value" subtitle="Last 12 months" />
          <div className="px-3 pb-3 pt-4"><AreaChart data={portfolio} /></div>
        </Card>
        <Card>
          <CardHeader title="Allocation" />
          <div className="p-5"><Donut data={allocation} centerLabel="Total" /></div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Your holdings" />
        <div className="mt-3">
          <Table head={["Investment", "Invested", "Current value", "Rate", "Matures", "Status"]}>
            {investments.map((i) => (
              <tr key={i.id} className="hover:bg-canvas/60">
                <td className="px-5 py-4"><p className="font-semibold text-ink">{i.name}</p><p className="text-xs text-muted">{i.kind} · {i.tenor}</p></td>
                <td className="px-5 py-4 tabular-nums">{formatNaira(i.principal)}</td>
                <td className="px-5 py-4 font-semibold tabular-nums text-ink">{formatNaira(i.current)} <span className="ml-1 text-xs text-success">+{formatNairaWhole(i.current - i.principal)}</span></td>
                <td className="px-5 py-4 tabular-nums">{(i.rate * 100).toFixed(1)}%</td>
                <td className="px-5 py-4">{i.maturity ? formatDate(i.maturity) : "Flexible"}</td>
                <td className="px-5 py-4"><StatusBadge status={i.status} /></td>
              </tr>
            ))}
          </Table>
        </div>
      </Card>

      <div>
        <h2 className="font-display text-lg font-bold text-ink">Explore products</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {investmentProducts.map((p) => (
            <Card key={p.id} className="flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-28px_rgba(6,31,77,.45)]">
              <div className="flex items-center justify-between"><Badge tone="brand">{p.kind}</Badge><Badge tone={RISK_TONE[p.risk as keyof typeof RISK_TONE]}><ShieldIcon className="size-3" />{p.risk} risk</Badge></div>
              <p className="mt-4 font-bold text-ink">{p.name}</p>
              <p className="mt-2 font-display text-3xl font-extrabold text-brand">{(p.rate * 100).toFixed(1)}%<span className="text-sm font-semibold text-muted"> p.a.</span></p>
              <dl className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Minimum</dt><dd className="font-semibold text-ink">{formatNairaWhole(p.min)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Tenor</dt><dd className="font-semibold text-ink">{p.tenor}</dd></div>
              </dl>
              <div className="mt-4"><Progress value={p.subscribed} tone="bg-gold" track="bg-gold-50" className="h-1.5" /><p className="mt-1.5 text-xs text-muted">{Math.round(p.subscribed * 100)}% subscribed</p></div>
              <button type="button" className={`${buttonPrimary} mt-5`}>Invest now</button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
