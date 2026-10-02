import type { Metadata } from "next";
import { TransactionsTable } from "@/components/app/transactions-table";
import { PageHeader } from "@/components/ui";
import { customerActivity } from "@/lib/activity";
import { requireCustomer } from "@/lib/auth";

export const metadata: Metadata = { title: "Transactions" };

export default async function TransactionsPage() {
  const user = await requireCustomer();
  return (
    <div className="space-y-6">
      <PageHeader title="Transactions" subtitle="Loans paid to you and the repayments you've made." />
      <TransactionsTable transactions={await customerActivity(user.id)} />
    </div>
  );
}
