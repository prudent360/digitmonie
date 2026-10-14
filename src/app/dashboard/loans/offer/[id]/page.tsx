import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { acceptLoanOffer, cancelApplication } from "@/app/actions/loans";
import { AcceptOfferForm } from "@/components/app/loan-offer";
import { LoanPlan } from "@/components/app/loan-plan";
import { CancelLoanButton } from "@/components/app/loan-repay";
import { Card, PageHeader } from "@/components/ui";
import { getDb } from "@/db";
import { loanProducts, loans, users } from "@/db/schema";
import { requireCustomer } from "@/lib/auth";

export const metadata: Metadata = { title: "Review your loan" };

export default async function LoanOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCustomer();
  const db = await getDb();
  const [row] = await db.select({ loan: loans, productName: loanProducts.name, officerFirst: users.firstName, officerLast: users.lastName })
    .from(loans).innerJoin(loanProducts, eq(loanProducts.id, loans.productId)).leftJoin(users, eq(users.id, loans.preparedById))
    .where(and(eq(loans.id, Number((await params).id) || 0), eq(loans.userId, user.id), eq(loans.status, "awaiting_customer")));
  if (!row) notFound();
  const officer = row.officerFirst ? `${row.officerFirst} ${row.officerLast}` : "Your credit officer";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/dashboard/loans" className="text-sm font-semibold text-brand">← Loans</Link>
      <PageHeader title="Review your loan" subtitle={`${officer} prepared this loan with you. Check every detail before you accept. Nothing is taken out in your name unless you accept.`} />
      <Card className="p-5 sm:p-6"><LoanPlan loan={row.loan} productName={row.productName} /></Card>
      <Card className="space-y-4 p-5 sm:p-6">
        <AcceptOfferForm action={acceptLoanOffer.bind(null, row.loan.id)} />
        <div className="border-t border-line pt-4">
          <p className="mb-2 text-sm text-body">Didn&apos;t ask for this loan, or something isn&apos;t right?</p>
          <CancelLoanButton action={cancelApplication} loanId={row.loan.id} label="Decline this loan" confirm="Decline this loan? Your credit officer can prepare a new one if you need it." />
        </div>
      </Card>
    </div>
  );
}
