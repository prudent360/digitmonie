import type { Metadata } from "next";
import { Badge, PageHeader } from "@/components/ui";
import { asc } from "drizzle-orm";
import { saveLoanProduct } from "@/app/actions/loans";
import { LoanProductForm, type ProductValues } from "@/components/app/product-form";
import { getDb } from "@/db";
import { loanProducts, type LoanProduct } from "@/db/schema";
import { requirePermission } from "@/lib/auth";

export const metadata: Metadata = { title: "Products" };

const kobo = (v: number | null) => (v == null ? "" : String(v / 100));
const pct = (bps: number) => String(bps / 100);
function toValues(p: LoanProduct): ProductValues {
  return {
    id: p.id, name: p.name, description: p.description, minAmount: kobo(p.minAmount), maxAmount: kobo(p.maxAmount), tenors: p.tenors.join(", "),
    monthlyRate: pct(p.monthlyRateBps), interestMethod: p.interestMethod, processingFee: pct(p.processingFeeBps), lateFee: pct(p.lateFeeBps),
    minKycTier: String(p.minKycTier), statementAbove: kobo(p.statementAbove), autoApproveUpTo: kobo(p.autoApproveUpTo), active: p.active,
  };
}

export default async function ProductsPage() {
  await requirePermission("investments.manage");
  const products = await (await getDb()).select().from(loanProducts).orderBy(asc(loanProducts.minAmount));
  return (
    <div className="space-y-6">
      <PageHeader title="Products" subtitle="Loan products offered to customers. Savings and investment products are coming soon."  />
      <div>
        <h2 className="font-display text-lg font-bold text-ink">Loan products</h2>
        <p className="mt-1 text-sm text-muted">Changes apply to new applications only. Existing loans keep the terms the customer accepted.</p>
        <div className="mt-4 space-y-4">
          {products.map((p) => (
            <details key={p.id} className="rounded-[7px] border border-line bg-white">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-4">
                <span><span className="font-bold text-ink">{p.name}</span> <span className="text-sm text-muted">· {(p.monthlyRateBps / 100).toFixed(2).replace(/\.?0+$/, "")}% a month · ₦{(p.minAmount / 100).toLocaleString()}–₦{(p.maxAmount / 100).toLocaleString()} · Tier {p.minKycTier}+</span></span>
                <Badge tone={p.active ? "success" : "neutral"} dot>{p.active ? "Offered" : "Hidden"}</Badge>
              </summary>
              <div className="border-t border-line p-5"><LoanProductForm action={saveLoanProduct} initial={toValues(p)} /></div>
            </details>
          ))}
          <details className="rounded-[7px] border border-dashed border-brand-200 bg-white">
            <summary className="cursor-pointer px-5 py-4 font-bold text-brand">+ New loan product</summary>
            <div className="border-t border-line p-5"><LoanProductForm action={saveLoanProduct} initial={{ name: "", description: "", minAmount: "", maxAmount: "", tenors: "1, 2, 3", monthlyRate: "4", interestMethod: "reducing", processingFee: "1", lateFee: "1", minKycTier: "1", statementAbove: "", autoApproveUpTo: "", active: false }} /></div>
          </details>
        </div>
      </div>
    </div>
  );
}
