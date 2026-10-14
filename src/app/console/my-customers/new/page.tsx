import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { addCustomer } from "@/app/actions/onboarding";
import { AddCustomerForm } from "@/components/app/customer-forms";
import { Card, PageHeader } from "@/components/ui";
import { can, requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Add customer" };

export default async function NewCustomerPage() {
  const staff = await requireStaff();
  if (!can(staff, "console.access") || !can(staff, "customers.onboard")) redirect("/console?denied=1");
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/console/my-customers" className="text-sm font-semibold text-brand">← My customers</Link>
      <PageHeader title="Add customer" subtitle="Open an account for a customer. They get a link by SMS and email to choose their own password. You never see or set it." />
      <Card className="p-5 sm:p-6"><AddCustomerForm action={addCustomer} /></Card>
    </div>
  );
}
