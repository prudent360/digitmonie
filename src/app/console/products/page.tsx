import type { Metadata } from "next";
import { PlusIcon } from "@/components/icons";
import { Badge, Card, PageHeader, Progress, Table, buttonPrimary } from "@/components/ui";
import { formatNairaWhole } from "@/lib/format";
import { investmentProducts, loanProducts } from "@/lib/mock-data";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Investment products" };

export default async function ProductsPage() {
  await requirePermission("investments.manage");
  return (
    <div className="space-y-6">
      <PageHeader title="Products" subtitle="Configure investment and loan products offered to customers." actions={<button type="button" className={buttonPrimary}><PlusIcon className="size-4" /> New product</button>} />
      <Card>
        <div className="px-5 pt-5"><h2 className="font-bold text-ink">Investment products</h2></div>
        <div className="mt-3">
          <Table head={["Product", "Type", "Rate (p.a.)", "Minimum", "Tenor", "Risk", "Subscribed", ""]}>
            {investmentProducts.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-3.5 font-semibold text-ink">{p.name}</td>
                <td className="px-5 py-3.5"><Badge tone="brand">{p.kind}</Badge></td>
                <td className="px-5 py-3.5 font-bold tabular-nums text-brand">{(p.rate * 100).toFixed(1)}%</td>
                <td className="px-5 py-3.5 tabular-nums">{formatNairaWhole(p.min)}</td>
                <td className="px-5 py-3.5">{p.tenor}</td>
                <td className="px-5 py-3.5">{p.risk}</td>
                <td className="w-40 px-5 py-3.5"><Progress value={p.subscribed} tone="bg-gold" track="bg-gold-50" className="h-1.5" /><span className="text-xs text-muted">{Math.round(p.subscribed * 100)}%</span></td>
                <td className="px-5 py-3.5 text-right"><button type="button" className="text-sm font-semibold text-brand">Edit</button></td>
              </tr>
            ))}
          </Table>
        </div>
      </Card>
      <Card>
        <div className="px-5 pt-5"><h2 className="font-bold text-ink">Loan products</h2></div>
        <div className="mt-3">
          <Table head={["Product", "Amount", "Tenor", "Rate", ""]}>
            {loanProducts.map((p) => (
              <tr key={p.name}>
                <td className="px-5 py-3.5 font-semibold text-ink">{p.name}</td>
                <td className="px-5 py-3.5">{p.range}</td>
                <td className="px-5 py-3.5">{p.tenor}</td>
                <td className="px-5 py-3.5">{p.rate}</td>
                <td className="px-5 py-3.5 text-right"><button type="button" className="text-sm font-semibold text-brand">Edit</button></td>
              </tr>
            ))}
          </Table>
        </div>
      </Card>
    </div>
  );
}
