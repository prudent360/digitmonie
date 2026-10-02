import type { Metadata } from "next";
import { verifyAddress, verifyBvn, verifyNin } from "@/app/actions/kyc";
import { AddressForm, BvnForm, NinSelfieForm } from "@/components/app/kyc-forms";
import { AlertIcon, CheckIcon, ClockIcon, LockIcon, ShieldIcon } from "@/components/icons";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireCustomer } from "@/lib/auth";
import { formatNairaWhole } from "@/lib/format";
import { getKycState } from "@/lib/kyc/service";
import { NIGERIAN_STATES } from "@/lib/kyc/states";
import { KYC_TIERS, type TierInfo } from "@/lib/kyc/tiers";

export const metadata: Metadata = { title: "Verify your identity" };

type Stage = "done" | "pending" | "current" | "locked";

function Limits({ t }: { t: TierInfo }) {
  return (
    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
      <div><dt className="inline">Per transaction </dt><dd className="inline font-semibold text-ink">{formatNairaWhole(t.singleLimit)}</dd></div>
      <div><dt className="inline">Daily </dt><dd className="inline font-semibold text-ink">{formatNairaWhole(t.dailyLimit)}</dd></div>
      <div><dt className="inline">Max balance </dt><dd className="inline font-semibold text-ink">{t.maxBalance ? formatNairaWhole(t.maxBalance) : "No limit"}</dd></div>
    </dl>
  );
}

export default async function VerifyPage() {
  const user = await requireCustomer();
  const { profile, latest } = await getKycState(user.id);

  const stageOf = (tier: number): Stage => {
    if (user.kycTier >= tier) return "done";
    if (latest(tier)?.status === "pending_review") return "pending";
    return user.kycTier === tier - 1 && !(tier > 1 && latest(tier - 1)?.status === "pending_review") ? "current" : "locked";
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Verify your identity" subtitle="Nigerian law (CBN KYC rules) requires us to confirm who you are. Each tier raises your limits." />

      <div className="flex items-start gap-3 rounded-[5px] border border-brand-100 bg-brand-50/60 p-4 text-sm text-body">
        <ShieldIcon className="mt-0.5 size-5 shrink-0 text-brand" />
        <p>Your BVN and NIN are encrypted and only used to confirm your identity. DigitMonie is licensed by the FCCPC and follows the Nigeria Data Protection Act.</p>
      </div>

      <ol className="space-y-4">
        {KYC_TIERS.map((t) => {
          const stage = stageOf(t.tier);
          const last = latest(t.tier);
          const rejected = stage === "current" && last?.status === "rejected" ? last.reason : null;
          return (
            <li key={t.tier}>
              <Card className={`p-5 sm:p-6 ${stage === "current" ? "border-brand ring-4 ring-brand-50" : ""}`}>
                <div className="flex items-start gap-4">
                  <span className={`flex size-11 shrink-0 items-center justify-center rounded-[5px] ${stage === "done" ? "bg-success text-white" : stage === "pending" ? "bg-warning-soft text-warning" : stage === "current" ? "bg-brand text-white" : "bg-canvas text-muted"}`}>
                    {stage === "done" ? <CheckIcon /> : stage === "pending" ? <ClockIcon /> : stage === "locked" ? <LockIcon /> : <span className="font-display font-extrabold">{t.tier}</span>}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-bold text-ink">{t.name}</h2>
                      {stage === "done" && <Badge tone="success" dot>Verified</Badge>}
                      {stage === "pending" && <Badge tone="warning" dot>Under review</Badge>}
                    </div>
                    <p className="text-sm text-body">{t.needs}{t.review === "staff" ? " · checked by our team" : " · checked instantly"}</p>
                    <Limits t={t} />
                    {stage === "done" && t.tier === 1 && profile?.bvnLast4 && <p className="mt-2 text-xs text-muted">BVN ending {profile.bvnLast4} · {profile.legalFirstName} {profile.legalLastName}</p>}
                    {stage === "done" && t.tier === 2 && profile?.ninLast4 && <p className="mt-2 text-xs text-muted">NIN ending {profile.ninLast4}</p>}
                    {stage === "pending" && <p className="mt-3 text-sm text-warning">We&apos;re checking your details and will text you within one working day.</p>}
                  </div>
                </div>

                {stage === "current" && (
                  <div className="mt-6 border-t border-line pt-6">
                    {rejected && (
                      <p className="mb-5 flex items-start gap-2 rounded-[5px] bg-danger-soft px-4 py-3 text-sm text-danger"><AlertIcon className="mt-0.5 size-4 shrink-0" /><span><b>Last attempt wasn&apos;t approved:</b> {rejected}</span></p>
                    )}
                    {t.tier === 1 && <BvnForm action={verifyBvn} />}
                    {t.tier === 2 && <NinSelfieForm action={verifyNin} />}
                    {t.tier === 3 && <AddressForm action={verifyAddress} states={NIGERIAN_STATES} />}
                  </div>
                )}
              </Card>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
