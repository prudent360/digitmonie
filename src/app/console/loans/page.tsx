import type { Metadata } from "next";
import { DecisionButtons } from "@/components/app/decision-buttons";
import { Card, PageHeader, StatTile, Table } from "@/components/ui";
import { formatDate, formatNaira } from "@/lib/format";
import { loanApplications } from "@/lib/mock-data";
import { can, requirePermission } from "@/lib/auth";

export const metadata: Metadata = { title: "Loan applications" };

function scoreTone(score: number) {
  return score >= 700 ? "text-success" : score >= 600 ? "text-warning" : "text-danger";
}

export default async function LoanApplicationsPage() {
  const user = await requirePermission("loans.review");
  const canApprove = can(user, "loans.approve");

  return (
    <div className="space-y-6">
      <PageHeader title="Loan applications" subtitle={canApprove ? "Review credit profiles and make decisions." : "Review applications. Final approval needs an admin."} />
      <div className="grid gap-4 sm:grid-cols-4">
        <StatTile label="Pending" value={String(loanApplications.filter((l) => l.status === "pending").length)} />
        <StatTile label="Approval rate (30d)" value="68%" />
        <StatTile label="Avg. decision time" value="4m 12s" />
        <StatTile label="Disbursed today" value="₦142.6m" />
      </div>
      <Card>
        <Table head={["Application", "Product", "Amount", "Credit score", "Income / DTI", "Submitted", "Decision"]}>
          {loanApplications.map((l) => (
            <tr key={l.id} className="hover:bg-canvas/60">
              <td className="px-5 py-3.5"><p className="font-semibold text-ink">{l.name}</p><p className="font-mono text-xs text-muted">{l.id}</p></td>
              <td className="px-5 py-3.5 text-body">{l.product}<p className="text-xs text-muted">{l.tenor} month{l.tenor > 1 ? "s" : ""}</p></td>
              <td className="whitespace-nowrap px-5 py-3.5 font-semibold tabular-nums text-ink">{formatNaira(l.amount)}</td>
              <td className={`px-5 py-3.5 font-bold tabular-nums ${scoreTone(l.score)}`}>{l.score}</td>
              <td className="whitespace-nowrap px-5 py-3.5 text-body">{formatNaira(l.income)}<p className={`text-xs ${l.dti > 0.5 ? "text-danger" : "text-muted"}`}>DTI {(l.dti * 100).toFixed(0)}%</p></td>
              <td className="whitespace-nowrap px-5 py-3.5 text-body">{formatDate(l.submitted, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
              <td className="px-5 py-3.5"><DecisionButtons initial={l.status} allowed={canApprove} lockedReason="Admin approval" /></td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
