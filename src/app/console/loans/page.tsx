import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Badge, Card, PageHeader, Table } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { toNaira } from "@/lib/loans/math";
import { QUEUES, loanQueueCounts, staffLoanQueue } from "@/lib/loans/queries";
import { refreshInstalments } from "@/lib/loans/service";
import { LOAN_STATUS_LABEL, LOAN_STATUS_TONE } from "@/lib/loans/status";

export const metadata: Metadata = { title: "Loans" };

const ngn = (kobo: number) => `₦${toNaira(kobo).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
const daysSince = (iso: string) => Math.max(0, Math.floor((Date.parse(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`) - Date.parse(`${iso}T00:00:00Z`)) / 86_400_000));

export default async function ConsoleLoansPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePermission("loans.review");
  await refreshInstalments();
  const { q = "review" } = await searchParams;
  const { queue, rows, overdue } = await staffLoanQueue(q);
  const counts = await loanQueueCounts();

  return (
    <div className="space-y-6">
      <PageHeader title="Loans" subtitle="Every application is reviewed by one person and approved by another." />
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {QUEUES.map((t) => {
          const n = counts[t.key as keyof typeof counts];
          return (
            <Link key={t.key} href={`/console/loans?q=${t.key}`} className={`flex shrink-0 items-center gap-2 rounded-[5px] px-4 py-2 text-sm font-semibold ${t.key === queue.key ? "bg-brand text-white" : "bg-white text-body ring-1 ring-line hover:text-brand"}`}>
              {t.label}{n ? <span className={`rounded-[5px] px-1.5 text-xs font-bold ${t.key === queue.key ? "bg-white/20" : t.key === "overdue" ? "bg-danger-soft text-danger" : "bg-gold text-ink"}`}>{n}</span> : null}
            </Link>
          );
        })}
      </div>
      <Card>
        {rows.length ? (
          <Table head={["Loan", "Customer", "Amount", "Score", queue.key === "overdue" ? "Overdue" : "Status", queue.key === "closed" || queue.key === "active" ? "Applied" : "Waiting since", ""]}>
            {rows.map(({ loan, productName, firstName, lastName, kycTier }) => {
              const od = overdue.get(loan.id);
              return (
                <tr key={loan.id} className={od ? "bg-danger-soft/30" : "hover:bg-canvas/60"}>
                  <td className="px-5 py-3.5"><p className="font-semibold text-ink">{productName}</p><p className="font-mono text-xs text-muted">{loan.reference}</p></td>
                  <td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar name={`${firstName} ${lastName}`} /><div><p className="font-semibold text-ink">{firstName} {lastName}</p><p className="text-xs text-muted">KYC Tier {kycTier}</p></div></div></td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-semibold tabular-nums text-ink">{ngn(loan.principal)}<p className="text-xs font-normal text-muted">{loan.tenorMonths} mo</p></td>
                  <td className="px-5 py-3.5">{loan.score ? <Badge tone={loan.score.band === "A" ? "success" : loan.score.band === "B" ? "brand" : loan.score.band === "C" ? "warning" : "danger"}>{loan.score.score} · {loan.score.band}</Badge> : "—"}</td>
                  <td className="whitespace-nowrap px-5 py-3.5">{queue.key === "overdue" && od ? <span className="text-sm font-bold text-danger">{ngn(od.owed)} · {daysSince(od.oldest)}d</span> : <Badge tone={LOAN_STATUS_TONE[loan.status]} dot>{LOAN_STATUS_LABEL[loan.status]}</Badge>}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-body">{formatDate(loan.createdAt.toISOString(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-5 py-3.5 text-right"><Link href={`/console/loans/${loan.id}`} className="font-semibold text-brand">Open</Link></td>
                </tr>
              );
            })}
          </Table>
        ) : <p className="p-12 text-center text-sm text-muted">Nothing in this queue.</p>}
      </Card>
    </div>
  );
}
