import type { Metadata } from "next";
import Link from "next/link";
import { recordFundingAction, resolveItemAction, runReconciliationAction } from "@/app/actions/reconciliation";
import { FundingForm, ResolveForm, RunForm } from "@/components/app/recon-forms";
import { Badge, Card, CardHeader, PageHeader, Table } from "@/components/ui";
import { can, requirePermission } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { todayIso, toNaira } from "@/lib/loans/math";
import { recentRuns, runDetail } from "@/lib/reconciliation";

export const metadata: Metadata = { title: "Reconciliation" };

const ngn = (kobo: number | null) => (kobo == null ? "—" : `${kobo < 0 ? "−" : ""}₦${toNaira(Math.abs(kobo)).toLocaleString("en-NG", { minimumFractionDigits: kobo % 100 ? 2 : 0, maximumFractionDigits: 2 })}`);
const STATUS = { matched: { tone: "success", label: "Matched" }, issues: { tone: "danger", label: "Issues" }, skipped: { tone: "neutral", label: "Skipped" }, failed: { tone: "warning", label: "Failed" } } as const;
const ISSUE = {
  missing_ours: "In Flutterwave, not in DigitMonie",
  missing_theirs: "In DigitMonie, not in Flutterwave",
  amount_mismatch: "Amounts differ",
  status_mismatch: "Status differs",
} as const;

export default async function ReconciliationPage({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  const staff = await requirePermission("transactions.view");
  const finance = can(staff, "finance.manage");
  const runs = await recentRuns();
  const requested = Number((await searchParams).run);
  const selected = await (requested ? runDetail(requested) : runs[0] ? runDetail(runs[0].id) : null);
  const today = todayIso();
  const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader title="Reconciliation" subtitle="Each day's payouts and collections, checked against Flutterwave's own records. Runs automatically every morning for the day before." actions={<Link href="/console/transactions" className="text-sm font-semibold text-brand">Money →</Link>} />

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          {finance && <Card className="p-5"><h2 className="mb-3 text-[15px] font-bold text-ink">Run now</h2><RunForm action={runReconciliationAction} defaultDate={yesterday} max={today} /></Card>}
          <Card>
            <CardHeader title="Recent days" />
            <ul className="divide-y divide-line pt-2">
              {runs.map((r) => (
                <li key={r.id}>
                  <Link href={`/console/reconciliation?run=${r.id}`} className={`flex items-center justify-between px-5 py-2.5 text-sm hover:bg-canvas ${selected?.run.id === r.id ? "bg-brand-50" : ""}`}>
                    <span className="font-semibold text-ink">{formatDate(r.date, { weekday: "short", day: "numeric", month: "short" })}</span>
                    <Badge tone={STATUS[r.status].tone} dot>{r.status === "issues" ? `${r.summary.issues} issue${r.summary.issues > 1 ? "s" : ""}` : STATUS[r.status].label}</Badge>
                  </Link>
                </li>
              ))}
              {!runs.length && <li className="px-5 py-6 text-sm text-muted">No runs yet.</li>}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          {selected ? (
            <>
              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-bold text-ink">{formatDate(selected.run.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h2>
                  <Badge tone={STATUS[selected.run.status].tone} dot>{STATUS[selected.run.status].label}</Badge>
                </div>
                {selected.run.summary.note && <p className="mt-2 text-sm text-warning">{selected.run.summary.note}</p>}
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["Payouts (Flutterwave / ours)", `${selected.run.summary.payoutsTheirs} / ${selected.run.summary.payoutsOurs}`],
                    ["Collections (Flutterwave / ours)", `${selected.run.summary.collectionsTheirs} / ${selected.run.summary.collectionsOurs}`],
                    ["Flutterwave balance", ngn(selected.run.balanceTheirs)],
                    ["Ledger: Flutterwave cash", ngn(selected.run.balanceOurs)],
                  ].map(([k, v]) => <div key={k} className="rounded-[5px] bg-canvas p-3"><dt className="text-xs text-muted">{k}</dt><dd className="mt-1 font-display text-lg font-bold text-ink">{v}</dd></div>)}
                </dl>
                {selected.run.balanceTheirs != null && selected.run.balanceOurs != null && selected.run.balanceTheirs !== selected.run.balanceOurs && (
                  <p className="mt-3 rounded-[5px] bg-warning-soft px-4 py-3 text-sm text-warning">
                    Balances differ by <b>{ngn(selected.run.balanceTheirs - selected.run.balanceOurs)}</b>. Usually this is funding or withdrawals not yet recorded below, or activity outside DigitMonie. The balance is a snapshot taken when the run happened.
                  </p>
                )}
              </Card>

              <Card>
                <CardHeader title="Issues" subtitle={selected.items.length ? `${selected.items.filter((i) => !i.resolvedAt).length} open of ${selected.items.length}` : "Nothing to look at"} />
                {selected.items.length ? (
                  <div className="mt-3">
                    <Table head={["Type", "Reference", "Problem", "Ours", "Flutterwave", finance ? "Resolve" : "Status"]}>
                      {selected.items.map((i) => (
                        <tr key={i.id} className={`align-top ${i.resolvedAt ? "opacity-60" : ""}`}>
                          <td className="px-5 py-3 capitalize">{i.kind}</td>
                          <td className="px-5 py-3 font-mono text-xs">{i.reference}</td>
                          <td className="px-5 py-3"><p className="font-semibold text-ink">{ISSUE[i.issue]}</p>{i.details && <p className="text-xs text-muted">{Object.entries(i.details).filter(([, v]) => v != null).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}</p>}</td>
                          <td className="whitespace-nowrap px-5 py-3 tabular-nums">{ngn(i.ourAmount)}</td>
                          <td className="whitespace-nowrap px-5 py-3 tabular-nums">{ngn(i.theirAmount)}</td>
                          <td className="w-72 px-5 py-3">
                            {i.resolvedAt ? <p className="text-xs text-success">Resolved: {i.resolutionNote}</p>
                              : finance ? <ResolveForm action={resolveItemAction.bind(null, i.id)} canRecheck={i.issue === "status_mismatch"} />
                              : <Badge tone="warning">Open</Badge>}
                          </td>
                        </tr>
                      ))}
                    </Table>
                  </div>
                ) : <p className="p-8 text-center text-sm text-muted">{selected.run.status === "matched" ? "Every payout and collection matched Flutterwave. ✓" : "No items."}</p>}
              </Card>
            </>
          ) : (
            <Card className="p-12 text-center text-sm text-muted">No reconciliation has run yet. {finance ? "Run one on the left." : ""}</Card>
          )}

          {finance && (
            <Card className="p-5">
              <h2 className="text-[15px] font-bold text-ink">Record funding or a withdrawal</h2>
              <p className="mt-1 text-xs text-muted">When the company tops up its Flutterwave balance or bank account (or takes money out), record it so the ledger&apos;s cash matches reality.</p>
              <div className="mt-4"><FundingForm action={recordFundingAction} today={today} /></div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
