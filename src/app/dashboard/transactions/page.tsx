import type { Metadata } from "next";
import { TransactionsTable } from "@/components/app/transactions-table";
import { PageHeader } from "@/components/ui";
import { transactions } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Transactions" };

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Transactions" subtitle="Every naira in and out of your account." />
      <TransactionsTable transactions={transactions} />
    </div>
  );
}
