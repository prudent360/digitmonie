import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { officerLookupPayout, prepareLoan } from "@/app/actions/onboarding";
import { LoanApplyForm } from "@/components/app/loan-apply";
import { PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { creditProfiles } from "@/db/schema";
import { can, fullName, requireStaff } from "@/lib/auth";
import { tierNames } from "@/lib/kyc";
import { EMPLOYMENT_TYPES, loanEligibility } from "@/lib/loans/service";
import { officerCustomer } from "@/lib/onboarding";
import { listBanks } from "@/lib/payments/banks";

export const metadata: Metadata = { title: "Prepare a loan" };

export default async function PrepareLoanPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff();
  if (!can(staff, "console.access") || !(can(staff, "customers.onboard") || can(staff, "users.manage"))) redirect("/console?denied=1");
  const customer = await officerCustomer(staff, Number((await params).id) || 0);
  if (!customer) redirect("/console/my-customers?missing=1");
  const back = `/console/my-customers/${customer.id}`;
  const { products, limit, blocked } = await loanEligibility(customer, true);
  if (blocked) redirect(back);
  const [credit] = await (await getDb()).select().from(creditProfiles).where(eq(creditProfiles.userId, customer.id));

  return (
    <div className="space-y-6">
      <Link href={back} className="text-sm font-semibold text-brand">← {fullName(customer)}</Link>
      <PageHeader title={`Prepare a loan for ${customer.firstName}`} subtitle={`Fill this in with ${customer.firstName}. They'll review the full cost and accept it in their app before it goes for review.`} />
      <LoanApplyForm
        action={prepareLoan.bind(null, customer.id)}
        lookup={officerLookupPayout.bind(null, customer.id)}
        products={products.map(({ id, name, description, minAmount, maxAmount, tenors, monthlyRateBps, interestMethod, processingFeeBps, lateFeeBps, minKycTier, statementAbove }) => ({ id, name, description, minAmount, maxAmount, tenors, monthlyRateBps, interestMethod, processingFeeBps, lateFeeBps, minKycTier, statementAbove }))}
        limit={limit}
        kycTier={customer.kycTier}
        tierNames={await tierNames()}
        banks={await listBanks()}
        employmentTypes={EMPLOYMENT_TYPES}
        defaults={{ monthlyIncome: credit?.monthlyIncome ? String(credit.monthlyIncome / 100) : "", employmentType: credit?.employmentType ?? "", employer: credit?.employer ?? "" }}
        onBehalf={customer.firstName}
      />
    </div>
  );
}
