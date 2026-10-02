import type { Metadata } from "next";
import Link from "next/link";
import type { KycStatus } from "@/db/schema";
import { Avatar, Badge, Card, PageHeader, Table } from "@/components/ui";
import { fullName, requirePermission } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { listKycSubmissions } from "@/lib/kyc/queries";

export const metadata: Metadata = { title: "KYC reviews" };

const TABS: { status: KycStatus; label: string }[] = [
  { status: "pending_review", label: "Waiting for review" },
  { status: "approved", label: "Approved" },
  { status: "rejected", label: "Rejected" },
];

export default async function KycQueuePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePermission("kyc.review");
  const { status: raw } = await searchParams;
  const status = TABS.find((t) => t.status === raw)?.status ?? "pending_review";
  const rows = await listKycSubmissions(status);

  return (
    <div className="space-y-6">
      <PageHeader title="KYC reviews" subtitle="Tier 1 and 2 are checked automatically; anything borderline, and every Tier 3 address, comes here." />
      <div className="flex gap-2">
        {TABS.map((t) => (
          <Link key={t.status} href={`/console/kyc?status=${t.status}`} className={`rounded-[5px] px-4 py-2 text-sm font-semibold ${t.status === status ? "bg-brand text-white" : "bg-white text-body ring-1 ring-line hover:text-brand"}`}>{t.label}</Link>
        ))}
      </div>
      <Card>
        {rows.length ? (
          <Table head={["Customer", "Tier", "Checks", "Note", "Submitted", ""]}>
            {rows.map(({ s, firstName, lastName, email }) => (
              <tr key={s.id} className="hover:bg-canvas/60">
                <td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar name={fullName({ firstName, lastName })} /><div><p className="font-semibold text-ink">{firstName} {lastName}</p><p className="text-xs text-muted">{email}</p></div></div></td>
                <td className="px-5 py-3.5"><Badge tone="brand">Tier {s.tier}</Badge></td>
                <td className="whitespace-nowrap px-5 py-3.5 text-xs text-body">
                  {s.checks.faceScore !== undefined && <span className="mr-3">Face <b className={s.checks.faceScore >= 90 ? "text-success" : "text-warning"}>{s.checks.faceScore}%</b></span>}
                  {s.checks.nameScore !== undefined && <span className="mr-3">Name <b className={s.checks.nameScore >= 80 ? "text-success" : "text-warning"}>{s.checks.nameScore}%</b></span>}
                  {s.checks.dobMatch !== undefined && <span>DOB <b className={s.checks.dobMatch ? "text-success" : "text-danger"}>{s.checks.dobMatch ? "✓" : "✗"}</b></span>}
                  {s.tier === 3 && <span>Document</span>}
                </td>
                <td className="max-w-xs px-5 py-3.5 text-xs text-body">{s.reason}</td>
                <td className="whitespace-nowrap px-5 py-3.5 text-body">{formatDate(s.createdAt.toISOString(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-5 py-3.5 text-right"><Link href={`/console/kyc/${s.id}`} className="font-semibold text-brand">{status === "pending_review" ? "Review" : "View"}</Link></td>
              </tr>
            ))}
          </Table>
        ) : <p className="p-12 text-center text-sm text-muted">{status === "pending_review" ? "Nothing waiting. Nice work." : "Nothing here yet."}</p>}
      </Card>
    </div>
  );
}
