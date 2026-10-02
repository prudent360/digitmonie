import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Badge, Card, PageHeader, StatTile, Table } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { BUCKETS, collectionsWorklist } from "@/lib/collections";
import { formatDate } from "@/lib/format";
import { toNaira } from "@/lib/loans/math";
import { refreshInstalments } from "@/lib/loans/service";
import { formatNgPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Collections" };

const ngn = (kobo: number) => `₦${toNaira(kobo).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

export default async function CollectionsPage({ searchParams }: { searchParams: Promise<{ bucket?: string; mine?: string }> }) {
  const staff = await requirePermission("loans.collect");
  await refreshInstalments();
  const { bucket, mine } = await searchParams;
  const all = await collectionsWorklist();
  const rows = all.filter((r) => (!bucket || r.bucket === bucket) && (!mine || r.loan.collectorId === staff.id));
  const qs = (b?: string, m?: boolean) => `/console/collections?${new URLSearchParams({ ...(b ? { bucket: b } : {}), ...(m ? { mine: "1" } : {}) })}`;
  const total = all.reduce((s, r) => s + r.overdueAmount, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Collections" subtitle="Overdue loans, oldest debt first. Contact only the borrower, between 8am and 6pm, without threats (FCCPC)." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Loans overdue" value={String(all.length)} />
        <StatTile label="Amount overdue" value={ngn(total)} />
        <StatTile label="Open promises to pay" value={String(all.filter((r) => r.promise).length)} hint={`${all.filter((r) => !r.loan.collectorId).length} loans not assigned to anyone`} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={qs(undefined, Boolean(mine))} className={`rounded-[7px] px-4 py-2 text-sm font-semibold ${!bucket ? "bg-brand text-white" : "bg-white text-body ring-1 ring-line hover:text-brand"}`}>All ({all.length})</Link>
        {BUCKETS.map((b) => {
          const n = all.filter((r) => r.bucket === b.key).length;
          return <Link key={b.key} href={qs(b.key, Boolean(mine))} className={`rounded-[7px] px-4 py-2 text-sm font-semibold ${bucket === b.key ? "bg-brand text-white" : "bg-white text-body ring-1 ring-line hover:text-brand"}`}>{b.label} ({n})</Link>;
        })}
        <Link href={qs(bucket, !mine)} className={`ml-auto rounded-[7px] px-4 py-2 text-sm font-semibold ${mine ? "bg-gold text-ink" : "bg-white text-body ring-1 ring-line"}`}>{mine ? "✓ " : ""}Assigned to me</Link>
      </div>
      <Card>
        {rows.length ? (
          <Table head={["Customer", "Days overdue", "Overdue", "Outstanding", "Last contact", "Promise", "Collector", ""]}>
            {rows.map((r) => (
              <tr key={r.loan.id} className={r.dpd > 60 ? "bg-danger-soft/30" : "hover:bg-canvas/60"}>
                <td className="px-5 py-3"><div className="flex items-center gap-3"><Avatar name={`${r.firstName} ${r.lastName}`} /><div><Link href={`/console/customers/${r.customerId}`} className="font-semibold text-ink hover:text-brand">{r.firstName} {r.lastName}</Link><p className="text-xs text-muted">{formatNgPhone(r.phone)} · <span className="font-mono">{r.loan.reference}</span></p></div></div></td>
                <td className="px-5 py-3"><Badge tone={r.dpd > 30 ? "danger" : "warning"}>{r.dpd} days</Badge></td>
                <td className="whitespace-nowrap px-5 py-3 font-bold tabular-nums text-danger">{ngn(r.overdueAmount)}</td>
                <td className="whitespace-nowrap px-5 py-3 tabular-nums">{ngn(r.outstanding)}</td>
                <td className="whitespace-nowrap px-5 py-3 text-body">{r.lastContactAt ? formatDate(new Date(r.lastContactAt).toISOString(), { day: "numeric", month: "short" }) : <span className="text-warning">Never</span>}</td>
                <td className="whitespace-nowrap px-5 py-3 text-body">{r.promise ? `${ngn(r.promise.amount)} by ${formatDate(r.promise.dueDate, { day: "numeric", month: "short" })}` : "—"}</td>
                <td className="whitespace-nowrap px-5 py-3 text-body">{r.collectorFirst ? `${r.collectorFirst} ${r.collectorLast}` : <span className="text-muted">Unassigned</span>}</td>
                <td className="px-5 py-3 text-right"><Link href={`/console/loans/${r.loan.id}`} className="font-semibold text-brand">Open</Link></td>
              </tr>
            ))}
          </Table>
        ) : <p className="p-12 text-center text-sm text-muted">{all.length ? "Nothing in this view." : "No overdue loans. 🎉"}</p>}
      </Card>
    </div>
  );
}
