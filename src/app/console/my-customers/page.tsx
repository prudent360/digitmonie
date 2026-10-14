import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar, Badge, Card, PageHeader, StatTile, Table, buttonPrimary } from "@/components/ui";
import { can, fullName, requireStaff } from "@/lib/auth";
import { formatDate, formatNumber } from "@/lib/format";
import { tierNames } from "@/lib/kyc";
import { toNaira } from "@/lib/loans/math";
import { LOAN_STATUS_LABEL, LOAN_STATUS_TONE } from "@/lib/loans/status";
import type { LoanStatus } from "@/db/schema";
import { myCustomers } from "@/lib/onboarding";
import { formatNgPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "My customers" };

const ngn = (kobo: number) => `₦${toNaira(kobo).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

export default async function MyCustomersPage({ searchParams }: { searchParams: Promise<{ missing?: string }> }) {
  const staff = await requireStaff();
  if (!can(staff, "console.access") || !can(staff, "customers.onboard")) redirect("/console?denied=1");
  const { missing } = await searchParams;
  const [rows, names] = await Promise.all([myCustomers(staff), tierNames()]);
  const waitingSetup = rows.filter((r) => r.user.status === "pending").length;
  const waitingAccept = rows.filter((r) => r.loan?.status === "awaiting_customer").length;

  return (
    <div className="space-y-6">
      <PageHeader title="My customers" subtitle="Customers you've onboarded or who are assigned to you." actions={<Link href="/console/my-customers/new" className={buttonPrimary}>Add customer</Link>} />
      {missing && <p role="status" className="rounded-[7px] bg-warning-soft px-4 py-3 text-sm font-medium text-warning">That customer isn&apos;t assigned to you.</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Customers" value={formatNumber(rows.length)} />
        <StatTile label="Haven't set up their account" value={formatNumber(waitingSetup)} />
        <StatTile label="Loans waiting for the customer" value={formatNumber(waitingAccept)} />
      </div>
      <Card>
        {rows.length ? (
          <Table head={["Customer", "Phone", "Account", "KYC", "Latest loan", "Added"]}>
            {rows.map(({ user: c, loan }) => (
              <tr key={c.id} className="hover:bg-canvas/60">
                <td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar name={fullName(c)} /><div><Link href={`/console/my-customers/${c.id}`} className="font-semibold text-ink hover:text-brand">{fullName(c)}</Link><p className="text-xs text-muted">{c.email}</p></div></div></td>
                <td className="whitespace-nowrap px-5 py-3.5 text-body">{formatNgPhone(c.phone)}</td>
                <td className="px-5 py-3.5">{c.status === "pending" ? <Badge tone="warning" dot>Not set up yet</Badge> : <Badge tone={c.status === "active" ? "success" : "danger"} dot>{c.status}</Badge>}</td>
                <td className="px-5 py-3.5">{c.kycTier ? <Badge tone="brand">{names[c.kycTier]}</Badge> : <Badge>Not verified</Badge>}</td>
                <td className="px-5 py-3.5">{loan ? <div><Badge tone={LOAN_STATUS_TONE[loan.status as LoanStatus]} dot>{LOAN_STATUS_LABEL[loan.status as LoanStatus]}</Badge><p className="mt-1 text-xs text-muted">{ngn(loan.principal)} {loan.product}</p></div> : <span className="text-muted">None</span>}</td>
                <td className="whitespace-nowrap px-5 py-3.5 text-body">{formatDate(c.createdAt.toISOString())}</td>
              </tr>
            ))}
          </Table>
        ) : (
          <div className="p-12 text-center">
            <p className="text-sm text-muted">You haven&apos;t added any customers yet.</p>
            <Link href="/console/my-customers/new" className={`${buttonPrimary} mt-4`}>Add your first customer</Link>
          </div>
        )}
      </Card>
    </div>
  );
}
