import type { Metadata } from "next";
import { DecisionButtons } from "@/components/app/decision-buttons";
import { IdCardIcon } from "@/components/icons";
import { Avatar, Badge, Card, PageHeader, Progress } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { kycQueue } from "@/lib/mock-data";
import { requirePermission } from "@/lib/auth";

export const metadata: Metadata = { title: "KYC reviews" };

const RISK = { low: "success", medium: "warning", high: "danger" } as const;

export default async function KycPage() {
  await requirePermission("kyc.review");
  return (
    <div className="space-y-6">
      <PageHeader title="KYC reviews" subtitle="Verify identity documents and approve tier upgrades." />
      <div className="grid gap-5 lg:grid-cols-2">
        {kycQueue.map((k) => (
          <Card key={k.id} className="p-5">
            <div className="flex items-start gap-4">
              <Avatar name={k.name} className="size-12 text-sm" />
              <div className="flex-1">
                <p className="font-bold text-ink">{k.name}</p>
                <p className="text-xs text-muted">Requested {k.requested} · submitted {formatDate(k.submitted, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <Badge tone={RISK[k.risk as keyof typeof RISK]} dot>{k.risk} risk</Badge>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              {k.documents.slice(0, 3).map((d) => (
                <div key={d} className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl bg-canvas text-xs font-semibold text-body ring-1 ring-line">
                  <IdCardIcon className="size-5 text-brand" />{d}
                </div>
              ))}
            </div>
            <div className="mt-5">
              <div className="flex justify-between text-xs"><span className="font-semibold text-body">Selfie ↔ BVN photo match</span><span className="font-bold text-ink">{Math.round(k.match * 100)}%</span></div>
              <Progress value={k.match} tone={k.match > 0.85 ? "bg-success" : k.match > 0.65 ? "bg-warning" : "bg-danger"} track="bg-canvas" className="mt-2 h-2" />
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
              <p className="text-xs text-muted">{k.documents.length} documents</p>
              <DecisionButtons initial="pending" approvedStatus="verified" declinedStatus="rejected" declineLabel="Reject" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
