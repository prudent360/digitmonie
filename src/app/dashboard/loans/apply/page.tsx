import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { applyLoan, lookupPayoutAccount } from "@/app/actions/loans";
import { LoanApplyForm } from "@/components/app/loan-apply";
import { PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { creditProfiles } from "@/db/schema";
import { requireCustomer } from "@/lib/auth";
import { EMPLOYMENT_TYPES, loanEligibility } from "@/lib/loans/service";
import { listBanks } from "@/lib/payments/banks";

export const metadata: Metadata = { title: "Apply for a loan" };

export default async function ApplyPage() {
  const user = await requireCustomer();
  const { products, limit, blocked } = await loanEligibility(user);
  if (blocked) redirect("/dashboard/loans");
  const [credit] = await (await getDb()).select().from(creditProfiles).where(eq(creditProfiles.userId, user.id));

  return (
    <div className="space-y-6">
      <Link href="/dashboard/loans" className="text-sm font-semibold text-brand">← Loans</Link>
      <PageHeader title="Apply for a loan" subtitle="See exactly what you'll repay before you apply. Checking your offer doesn't affect your credit score." />
      <LoanApplyForm
        action={applyLoan}
        lookup={lookupPayoutAccount}
        products={products.map(({ id, name, description, minAmount, maxAmount, tenors, monthlyRateBps, interestMethod, processingFeeBps, lateFeeBps, minKycTier, statementAbove }) => ({ id, name, description, minAmount, maxAmount, tenors, monthlyRateBps, interestMethod, processingFeeBps, lateFeeBps, minKycTier, statementAbove }))}
        limit={limit}
        kycTier={user.kycTier}
        banks={await listBanks()}
        employmentTypes={EMPLOYMENT_TYPES}
        defaults={{ monthlyIncome: credit?.monthlyIncome ? String(credit.monthlyIncome / 100) : "", employmentType: credit?.employmentType ?? "", employer: credit?.employer ?? "" }}
      />
    </div>
  );
}
