import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, gte, ilike, or, type SQL } from "drizzle-orm";
import { SearchIcon } from "@/components/icons";
import { Avatar, Badge, Card, PageHeader, StatTile, StatusBadge, Table, buttonSecondary } from "@/components/ui";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { fullName, requirePermission } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/format";
import { CUSTOMER_ROLE } from "@/lib/permissions";
import { formatNgPhone, normalizeNgPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Customers" };

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; deleted?: string }> }) {
  await requirePermission("users.view");
  const { q = "", deleted } = await searchParams;
  const query = q.trim().slice(0, 80);
  const db = await getDb();

  const isCustomer = eq(users.roleKey, CUSTOMER_ROLE);
  const phone = normalizeNgPhone(query);
  const search: SQL | undefined = query
    ? or(ilike(users.firstName, `%${query}%`), ilike(users.lastName, `%${query}%`), ilike(users.email, `%${query}%`), phone ? eq(users.phone, phone) : undefined)
    : undefined;
  const rows = await db.select().from(users).where(and(isCustomer, search)).orderBy(desc(users.createdAt)).limit(100);

  const [{ total }] = await db.select({ total: count() }).from(users).where(isCustomer);
  const [{ verified }] = await db.select({ verified: count() }).from(users).where(and(isCustomer, gte(users.kycTier, 1)));
  const [{ recent }] = await db.select({ recent: count() }).from(users).where(and(isCustomer, gte(users.createdAt, daysAgo(7))));
  const [{ restricted }] = await db.select({ restricted: count() }).from(users).where(and(isCustomer, or(eq(users.status, "restricted"), eq(users.status, "frozen"))));

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" subtitle="Everyone with a DigitMonie account." />
      {deleted && <p role="status" className="rounded-[7px] bg-success-soft px-4 py-3 text-sm font-medium text-success">The account was deleted. A record of who deleted it stays in the audit log.</p>}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatTile label="Total customers" value={formatNumber(total)} />
        <StatTile label="BVN verified" value={total ? `${Math.round((verified / total) * 100)}%` : "—"} hint={`${formatNumber(verified)} of ${formatNumber(total)}`} />
        <StatTile label="Joined this week" value={formatNumber(recent)} />
        <StatTile label="Restricted / frozen" value={formatNumber(restricted)} />
      </div>
      <Card>
        <form className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <label className="relative w-full sm:w-80">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input name="q" defaultValue={query} placeholder="Name, email or phone number" className="w-full rounded-[7px] border border-line py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand-100" />
          </label>
          <button className={buttonSecondary}>Search</button>
          {query && <span className="text-sm text-muted">{rows.length} match{rows.length === 1 ? "" : "es"}</span>}
        </form>
        {rows.length ? (
          <Table head={["Customer", "Phone", "KYC", "Status", "Joined", "Last sign-in"]}>
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-canvas/60">
                <td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar name={fullName(c)} /><div><Link href={`/console/customers/${c.id}`} className="font-semibold text-ink hover:text-brand">{fullName(c)}</Link><p className="text-xs text-muted">{c.email}</p></div></div></td>
                <td className="whitespace-nowrap px-5 py-3.5 text-body">{formatNgPhone(c.phone)}{!c.phoneVerifiedAt && <span className="ml-2"><Badge tone="warning">unverified</Badge></span>}</td>
                <td className="px-5 py-3.5">{c.kycTier ? <Badge tone="brand">Tier {c.kycTier}</Badge> : <Badge>Not verified</Badge>}</td>
                <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
                <td className="whitespace-nowrap px-5 py-3.5 text-body">{formatDate(c.createdAt.toISOString())}</td>
                <td className="whitespace-nowrap px-5 py-3.5 text-body">{c.lastLoginAt ? formatDate(c.lastLoginAt.toISOString(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never"}</td>
              </tr>
            ))}
          </Table>
        ) : <p className="p-12 text-center text-sm text-muted">{query ? "No customers match that search." : "No customers yet."}</p>}
      </Card>
    </div>
  );
}
