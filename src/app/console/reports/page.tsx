import type { Metadata } from "next";
import Link from "next/link";
import { GroupedBars } from "@/components/charts/charts";
import { DownloadIcon } from "@/components/icons";
import { Card, CardHeader, PageHeader, StatTile, Table, buttonSecondary } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { toNaira } from "@/lib/loans/math";
import { collectionsStats, funnel, monthlySeries, portfolio, productPerformance } from "@/lib/reports";

export const metadata: Metadata = { title: "Reports" };

const ngn = (kobo: number) => `₦${toNaira(kobo).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
const pct = (r: number | null) => (r == null ? "—" : `${(r * 100).toFixed(1)}%`);
const PERIODS = [{ days: 30, label: "30 days" }, { days: 90, label: "90 days" }, { days: 365, label: "12 months" }];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requirePermission("reports.view");
  const requested = (await searchParams).days;
  const days = PERIODS.find((p) => String(p.days) === requested)?.days ?? 30;
  const [f, book, series, products, col] = await Promise.all([funnel(days), portfolio(), monthlySeries(12), productPerformance(), collectionsStats(days)]);
  const revenueTotal = (m: (typeof series)[number]) => m.interest + m.fees + m.lateFees + m.recoveries;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Lending performance from the live data and the ledger." actions={
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => <Link key={p.days} href={`/console/reports?days=${p.days}`} className={`rounded-[7px] px-3.5 py-2 text-sm font-semibold ${p.days === days ? "bg-brand text-white" : "bg-white text-body ring-1 ring-line"}`}>{p.label}</Link>)}
        </div>
      } />

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Applications · last {PERIODS.find((p) => p.days === days)!.label}</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile label="Applications" value={formatNumber(f.total)} hint={`${f.waiting} waiting · ${f.cancelled} cancelled`} />
          <StatTile label="Approval rate" value={pct(f.approved + f.declined ? f.approvalRate : null)} hint={`${f.approved} approved · ${f.declined} declined`} />
          <StatTile label="Approved automatically" value={pct(f.approved ? f.autoApproved / f.approved : null)} hint={`${f.autoApproved} of ${f.approved}`} />
          <StatTile label="Average time to approve" value={f.avgDecisionHours == null ? "—" : f.avgDecisionHours < 1 ? `${Math.round(f.avgDecisionHours * 60)} min` : `${f.avgDecisionHours.toFixed(1)} h`} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Collected vs disbursed" subtitle="Principal paid out and repayments received, last 12 months" />
          <div className="px-3 pb-3 pt-4"><GroupedBars data={series.map((m) => ({ label: m.label, inflow: m.collected / 100, outflow: m.disbursed / 100 }))} labels={["Collected", "Disbursed"]} /></div>
        </Card>
        <Card>
          <CardHeader title="Portfolio quality" subtitle={`${ngn(book.principal)} principal owed across ${book.activeLoans} loans`} />
          <div className="mt-3">
            <Table head={["Days overdue", "Loans", "Principal", "Share"]}>
              {book.buckets.map((b) => (
                <tr key={b.key}>
                  <td className="px-5 py-2.5 font-semibold text-ink">{b.label}</td>
                  <td className="px-5 py-2.5 tabular-nums">{b.loans}</td>
                  <td className="px-5 py-2.5 tabular-nums">{ngn(b.principal)}</td>
                  <td className="w-40 px-5 py-2.5">
                    <div className="flex items-center gap-2"><span className="h-1.5 flex-1 overflow-hidden rounded-[7px] bg-canvas"><span className={`block h-full ${b.key === "current" ? "bg-success" : b.key === "1-7" || b.key === "8-30" ? "bg-warning" : "bg-danger"}`} style={{ width: `${book.principal ? (b.principal / book.principal) * 100 : 0}%` }} /></span><span className="w-10 text-right text-xs tabular-nums text-muted">{book.principal ? Math.round((b.principal / book.principal) * 100) : 0}%</span></div>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
          <p className="border-t border-line px-5 py-3 text-sm">Portfolio at risk (30+ days): <b>{pct(book.par30Ratio)}</b></p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Revenue and losses by month" subtitle="From the ledger" />
        <div className="mt-3">
          <Table head={["Month", "Interest", "Processing fees", "Late fees", "Recoveries", "Total income", "Written off", "Provider fees"]}>
            {[...series].reverse().map((m) => (
              <tr key={m.key}>
                <td className="px-5 py-2.5 font-semibold text-ink">{m.label} {m.key.slice(0, 4)}</td>
                <td className="px-5 py-2.5 tabular-nums">{ngn(m.interest)}</td>
                <td className="px-5 py-2.5 tabular-nums">{ngn(m.fees)}</td>
                <td className="px-5 py-2.5 tabular-nums">{ngn(m.lateFees)}</td>
                <td className="px-5 py-2.5 tabular-nums">{ngn(m.recoveries)}</td>
                <td className="px-5 py-2.5 font-bold tabular-nums text-success">{ngn(revenueTotal(m))}</td>
                <td className="px-5 py-2.5 tabular-nums text-danger">{m.losses ? `−${ngn(m.losses)}` : "—"}</td>
                <td className="px-5 py-2.5 tabular-nums text-body">{m.providerFees ? `−${ngn(m.providerFees)}` : "—"}</td>
              </tr>
            ))}
          </Table>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Products" subtitle="All time" />
          <div className="mt-3">
            <Table head={["Product", "Loans", "Disbursed", "Owed now", "Repaid", "Defaulted / written off", "Interest earned"]}>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-2.5 font-semibold text-ink">{p.name}{!p.active && <span className="ml-1 text-xs text-muted">(hidden)</span>}</td>
                  <td className="px-5 py-2.5 tabular-nums">{p.loans}</td>
                  <td className="px-5 py-2.5 tabular-nums">{ngn(p.disbursed)}</td>
                  <td className="px-5 py-2.5 tabular-nums">{ngn(p.outstanding)}</td>
                  <td className="px-5 py-2.5 tabular-nums">{p.repaid}</td>
                  <td className={`px-5 py-2.5 tabular-nums ${p.badLoans ? "font-semibold text-danger" : ""}`}>{p.badLoans}</td>
                  <td className="px-5 py-2.5 tabular-nums">{ngn(p.interest)}</td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-[15px] font-bold text-ink">Collections · last {PERIODS.find((p) => p.days === days)!.label}</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
            {[["Contacts made", formatNumber(col.contacts)], ["Promises made", formatNumber(col.promisesMade)], ["Promises kept", `${col.kept} (${pct(col.keptRate)})`], ["Promises broken", formatNumber(col.broken)]].map(([k, v]) => (
              <div key={k} className="rounded-[7px] bg-canvas p-3"><dt className="text-xs text-muted">{k}</dt><dd className="mt-1 font-display text-lg font-bold text-ink">{v}</dd></div>
            ))}
          </dl>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-[15px] font-bold text-ink">Export</h2>
        <p className="mt-1 text-xs text-muted">CSV files for Excel or Google Sheets. Exports contain customer names and are recorded in the audit log.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[["loans", "Loans"], ["repayments", "Repayments"], ["payouts", "Payouts"]].map(([type, label]) => (
            <a key={type} href={`/console/reports/export?type=${type}&days=${days}`} className={buttonSecondary}><DownloadIcon className="size-4" /> {label} (last {PERIODS.find((p) => p.days === days)!.label})</a>
          ))}
        </div>
      </Card>
    </div>
  );
}
