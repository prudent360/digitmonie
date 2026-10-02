import type { Metadata } from "next";
import { AlertIcon, DownloadIcon } from "@/components/icons";
import { Badge, Card, PageHeader, StatusBadge, Table, buttonSecondary } from "@/components/ui";
import { formatDate, formatNaira } from "@/lib/format";
import { platformTransactions } from "@/lib/mock-data";
import { can, requirePermission } from "@/lib/auth";

export const metadata: Metadata = { title: "Transactions" };

export default async function ConsoleTransactionsPage() {
  const user = await requirePermission("transactions.view");
  const canReverse = can(user, "transactions.reverse");

  return (
    <div className="space-y-6">
      <PageHeader title="Transactions" subtitle="Monitor platform activity in real time." actions={<button type="button" className={buttonSecondary}><DownloadIcon className="size-4" /> Export</button>} />
      <Card>
        <Table head={["Reference", "Customer", "Channel", "Amount", "Time", "Status", ""]}>
          {platformTransactions.map((t) => (
            <tr key={t.id} className={t.flagged ? "bg-danger-soft/40" : "hover:bg-canvas/60"}>
              <td className="px-5 py-3.5 font-mono text-xs text-body">{t.reference}{t.flagged && <span className="ml-2"><Badge tone="danger"><AlertIcon className="size-3" /> AML</Badge></span>}</td>
              <td className="px-5 py-3.5 font-semibold text-ink">{t.customer}</td>
              <td className="px-5 py-3.5 text-body">{t.channel}</td>
              <td className={`whitespace-nowrap px-5 py-3.5 font-bold tabular-nums ${t.type === "credit" ? "text-success" : "text-ink"}`}>{t.type === "credit" ? "+" : "−"}{formatNaira(t.amount)}</td>
              <td className="whitespace-nowrap px-5 py-3.5 text-body">{formatDate(t.date, { hour: "2-digit", minute: "2-digit" })}</td>
              <td className="px-5 py-3.5"><StatusBadge status={t.status} /></td>
              <td className="px-5 py-3.5 text-right">
                {canReverse && t.status !== "failed" ? <button type="button" className="text-sm font-semibold text-danger">Reverse</button> : <button type="button" className="text-sm font-semibold text-brand">Details</button>}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
