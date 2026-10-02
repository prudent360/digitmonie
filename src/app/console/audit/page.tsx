import type { Metadata } from "next";
import Link from "next/link";
import { SearchIcon } from "@/components/icons";
import { Card, PageHeader, Table, buttonSecondary } from "@/components/ui";
import { listAudit } from "@/lib/audit-queries";
import { requirePermission } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Audit log" };

const PAGE_SIZE = 50;

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requirePermission("audit.view");
  const { q = "", page = "1" } = await searchParams;
  const current = Math.max(1, Number(page) || 1);
  const query = q.trim().slice(0, 100);
  const { rows, total } = await listAudit({ limit: PAGE_SIZE, offset: (current - 1) * PAGE_SIZE, query: query || undefined });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => `/console/audit?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(p) })}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" subtitle="Every staff action and security change, newest first. Entries can't be edited or deleted." />
      <Card>
        <form className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <label className="relative w-full sm:w-80">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input name="q" defaultValue={query} placeholder="Search actions, people or emails" className="w-full rounded-[7px] border border-line py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand-100" />
          </label>
          <button className={buttonSecondary}>Search</button>
          <span className="ml-auto text-sm text-muted">{total.toLocaleString()} entr{total === 1 ? "y" : "ies"}</span>
        </form>
        {rows.length ? (
          <Table head={["When", "Who", "What", "Action", "IP address"]}>
            {rows.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="whitespace-nowrap px-5 py-3 text-body">{formatDate(r.createdAt.toISOString(), { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</td>
                <td className="px-5 py-3"><p className="font-semibold text-ink">{r.actorName ?? "System"}</p>{r.actorEmail && <p className="text-xs text-muted">{r.actorEmail}</p>}</td>
                <td className="px-5 py-3 text-ink">{r.summary}</td>
                <td className="px-5 py-3"><code className="rounded-[7px] bg-canvas px-1.5 py-0.5 text-xs text-body">{r.action}</code></td>
                <td className="px-5 py-3 font-mono text-xs text-muted">{r.ip}</td>
              </tr>
            ))}
          </Table>
        ) : <p className="p-12 text-center text-sm text-muted">{query ? "Nothing matches that search." : "Nothing has been recorded yet."}</p>}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-line p-4 text-sm">
            {current > 1 ? <Link href={href(current - 1)} className={buttonSecondary}>Newer</Link> : <span />}
            <span className="text-muted">Page {current} of {pages}</span>
            {current < pages ? <Link href={href(current + 1)} className={buttonSecondary}>Older</Link> : <span />}
          </div>
        )}
      </Card>
    </div>
  );
}
