import type { Metadata } from "next";
import { DownloadIcon, FilterIcon } from "@/components/icons";
import { Avatar, Badge, Card, PageHeader, StatTile, StatusBadge, Table, buttonSecondary } from "@/components/ui";
import { formatDate, formatNaira, formatNumber } from "@/lib/format";
import { consoleKpis, customers } from "@/lib/mock-data";
import { can } from "@/lib/roles";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage() {
  const session = await requirePermission("users.view");
  const canManage = can(session.role, "users.manage");

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" subtitle="Search, review and manage customer accounts." actions={<><button type="button" className={buttonSecondary}><FilterIcon className="size-4" /> Filters</button><button type="button" className={buttonSecondary}><DownloadIcon className="size-4" /> Export CSV</button></>} />
      <div className="grid gap-4 sm:grid-cols-4">
        <StatTile label="Total customers" value={formatNumber(consoleKpis.activeUsers)} />
        <StatTile label="KYC verified" value="81.4%" />
        <StatTile label="New this week" value="6,912" />
        <StatTile label="Restricted / frozen" value="214" />
      </div>
      <Card>
        <Table head={["Customer", "Phone", "Tier", "KYC", "Balance", "Joined", "Status", ""]}>
          {customers.map((c) => (
            <tr key={c.id} className="hover:bg-canvas/60">
              <td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar name={c.name} /><div><p className="font-semibold text-ink">{c.name}</p><p className="text-xs text-muted">{c.email} · {c.state}</p></div></div></td>
              <td className="whitespace-nowrap px-5 py-3.5 text-body">{c.phone}</td>
              <td className="px-5 py-3.5"><Badge tone="brand">{c.tier}</Badge></td>
              <td className="px-5 py-3.5"><StatusBadge status={c.kyc} /></td>
              <td className="whitespace-nowrap px-5 py-3.5 font-semibold tabular-nums text-ink">{formatNaira(c.balance)}</td>
              <td className="whitespace-nowrap px-5 py-3.5 text-body">{formatDate(c.joined)}</td>
              <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
              <td className="px-5 py-3.5 text-right">
                {canManage ? <button type="button" className="text-sm font-semibold text-brand">Manage</button> : <button type="button" className="text-sm font-semibold text-brand">View</button>}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
