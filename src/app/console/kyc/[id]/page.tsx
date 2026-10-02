import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { decideKyc } from "@/app/actions/kyc";
import { KycDecision } from "@/components/app/kyc-review";
import { Avatar, Badge, Card, CardHeader, StatusBadge } from "@/components/ui";
import { logAudit } from "@/lib/audit";
import { fullName, requirePermission } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getKycSubmission } from "@/lib/kyc/queries";
import { kycThresholds } from "@/lib/kyc";
import { formatNgPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "KYC review" };

const DOC_LABEL = { selfie: "Selfie", id_photo: "Photo on BVN/NIN record", proof_of_address: "Proof of address" } as const;

function Check({ label, ok, value }: { label: string; ok: boolean | undefined; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2.5 text-sm last:border-0">
      <span className="text-body">{label}</span>
      <span className={`font-bold ${ok === undefined ? "text-muted" : ok ? "text-success" : "text-danger"}`}>{value}</span>
    </div>
  );
}

export default async function KycReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission("kyc.review");
  const { id } = await params;
  const data = await getKycSubmission(Number(id));
  if (!data) notFound();
  const { s, user, profile, documents, history } = data;
  // Viewing someone's identity documents is itself recorded (NDPA accountability).
  await logAudit({ actorId: staff.id, action: "kyc.viewed", summary: `viewed Tier ${s.tier} KYC for ${fullName(user)}`, target: { type: "kyc_submission", id: s.id } });
  const c = s.checks;
  const { faceAutoApprove, nameMatch } = await kycThresholds();

  return (
    <div className="space-y-6">
      <Link href="/console/kyc" className="text-sm font-semibold text-brand">← KYC reviews</Link>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={fullName(user)} className="size-14 text-base" />
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-ink">{fullName(user)} · Tier {s.tier}</h1>
          <p className="text-sm text-muted">{user.email} · {formatNgPhone(user.phone)} · joined {formatDate(user.createdAt.toISOString())} · currently Tier {user.kycTier}</p>
        </div>
        <StatusBadge status={s.status === "pending_review" ? "pending" : s.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Checks</h2>
            {s.reason && <p className="mt-2 rounded-[7px] bg-warning-soft px-3 py-2 text-sm text-warning">{s.reason}</p>}
            <div className="mt-3">
              {c.provider && <Check label="Verified with" ok={undefined} value={c.provider === "sandbox" ? "Test provider" : c.provider} />}
              {c.nameScore !== undefined && <Check label="Name match" ok={c.nameScore >= nameMatch} value={`${c.nameScore}%`} />}
              {c.dobMatch !== undefined && <Check label="Date of birth match" ok={c.dobMatch} value={c.dobMatch ? "Yes" : "No"} />}
              {c.faceScore !== undefined && <Check label="Selfie vs ID photo" ok={c.faceScore >= faceAutoApprove} value={`${c.faceScore}%`} />}
              {c.watchlisted !== undefined && <Check label="On a watch-list" ok={!c.watchlisted} value={c.watchlisted ? "Yes" : "No"} />}
              {c.duplicate && <Check label="Already linked to another account" ok={false} value="Yes" />}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Identity on record</h2>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ["Name on account", fullName(user)],
                ["Name on BVN", profile?.legalFirstName ? [profile.legalFirstName, profile.legalMiddleName, profile.legalLastName].filter(Boolean).join(" ") : "—"],
                ["Date of birth", profile?.dateOfBirth ?? "—"],
                ["BVN", profile?.bvnLast4 ? `••••••• ${profile.bvnLast4}` : "—"],
                ["NIN", profile?.ninLast4 ? `••••••• ${profile.ninLast4}` : "—"],
                ...(s.tier === 3 ? [["Address", [profile?.addressLine, profile?.city, profile?.state].filter(Boolean).join(", ") || "—"]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold text-ink">{v}</dd></div>
              ))}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Decision</h2>
            {s.status === "pending_review" ? (
              <div className="mt-4"><KycDecision action={decideKyc.bind(null, s.id)} /></div>
            ) : (
              <p className="mt-2 text-sm text-body">
                {s.status === "approved" ? "Approved" : "Rejected"} {s.decidedBy === "auto" ? "automatically" : `by ${data.reviewerFirst ?? "a team member"} ${data.reviewerLast ?? ""}`}
                {s.reviewedAt && ` on ${formatDate(s.reviewedAt.toISOString(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}.
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Documents" subtitle="Only staff who can review KYC can open these. Every view is logged." />
            {documents.length ? (
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                {documents.map((d) => (
                  <figure key={d.id} className="overflow-hidden rounded-[7px] border border-line">
                    {d.mimeType === "application/pdf" ? (
                      <a href={`/console/kyc/document/${d.id}`} target="_blank" rel="noreferrer" className="flex aspect-[3/4] items-center justify-center bg-canvas text-sm font-semibold text-brand">Open PDF ({Math.round(d.size / 1024)} KB)</a>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- private, permission-checked image route
                      <img src={`/console/kyc/document/${d.id}`} alt={DOC_LABEL[d.kind]} className="aspect-[3/4] w-full bg-canvas object-cover" />
                    )}
                    <figcaption className="border-t border-line px-3 py-2 text-xs font-semibold text-body">{DOC_LABEL[d.kind]}</figcaption>
                  </figure>
                ))}
              </div>
            ) : <p className="p-5 text-sm text-muted">No documents with this submission.</p>}
          </Card>

          <Card>
            <CardHeader title="History" subtitle="All verification attempts by this customer" />
            <ul className="divide-y divide-line pt-2">
              {history.map((h) => (
                <li key={h.id} className={`flex items-center justify-between gap-3 px-5 py-3 text-sm ${h.id === s.id ? "bg-brand-50/50" : ""}`}>
                  <span className="text-ink">Tier {h.tier} · {formatDate(h.createdAt.toISOString(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="flex items-center gap-2">{h.decidedBy && <Badge>{h.decidedBy}</Badge>}<StatusBadge status={h.status === "pending_review" ? "pending" : h.status} /></span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
