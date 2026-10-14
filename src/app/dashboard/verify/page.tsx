import type { Metadata } from "next";
import { verifyAddress, verifyNin, verifyTier1 } from "@/app/actions/kyc";
import { AddressForm, NinSelfieForm, Tier1Form } from "@/components/app/kyc-forms";
import { AlertIcon, CheckIcon, ClockIcon, LockIcon, ShieldIcon } from "@/components/icons";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireCustomer } from "@/lib/auth";
import { formatNairaWhole } from "@/lib/format";
import { getTiers, tier1IdKinds } from "@/lib/kyc";
import { getKycState } from "@/lib/kyc/service";
import { NIGERIAN_STATES } from "@/lib/kyc/states";
import { tierNeeds, type Tier } from "@/lib/kyc/tiers";
import { productsByTier } from "@/lib/loans/queries";

export const metadata: Metadata = { title: "Verify your identity" };

type Stage = "done" | "pending" | "current" | "locked";

function Unlocks({ t, products }: { t: Tier; products: string[] }) {
  return (
    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
      <div><dt className="inline">Starting loan limit </dt><dd className="inline font-semibold text-ink">{formatNairaWhole(t.startingLimit / 100)}</dd></div>
      {products.length > 0 && <div><dt className="inline">Unlocks </dt><dd className="inline font-semibold text-ink">{products.join(", ")}</dd></div>}
    </dl>
  );
}

export default async function VerifyPage() {
  const user = await requireCustomer();
  const [{ profile, latest }, idKinds, tiers, products] = await Promise.all([getKycState(user.id), tier1IdKinds(), getTiers(), productsByTier()]);

  const stageOf = (tier: number): Stage => {
    if (user.kycTier >= tier) return "done";
    if (latest(tier)?.status === "pending_review") return "pending";
    return user.kycTier === tier - 1 && !(tier > 1 && latest(tier - 1)?.status === "pending_review") ? "current" : "locked";
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Verify your identity" subtitle="Nigerian law requires us to confirm who you are. Each tier raises how much you can borrow." />

      <div className="flex items-start gap-3 rounded-[7px] border border-brand-100 bg-brand-50/60 p-4 text-sm text-body">
        <ShieldIcon className="mt-0.5 size-5 shrink-0 text-brand" />
        <p>Your NIN and BVN are encrypted and only used to confirm your identity. DigitMonie is licensed by the FCCPC and follows the Nigeria Data Protection Act.</p>
      </div>

      <ol className="space-y-4">
        {tiers.map((t) => {
          const stage = stageOf(t.tier);
          const last = latest(t.tier);
          const rejected = stage === "current" && last?.status === "rejected" ? last.reason : null;
          return (
            <li key={t.tier}>
              <Card className={`p-5 sm:p-6 ${stage === "current" ? "border-brand ring-4 ring-brand-50" : ""}`}>
                <div className="flex items-start gap-4">
                  <span className={`flex size-11 shrink-0 items-center justify-center rounded-[7px] ${stage === "done" ? "bg-success text-white" : stage === "pending" ? "bg-warning-soft text-warning" : stage === "current" ? "bg-brand text-white" : "bg-canvas text-muted"}`}>
                    {stage === "done" ? <CheckIcon /> : stage === "pending" ? <ClockIcon /> : stage === "locked" ? <LockIcon /> : <span className="font-display font-extrabold">{t.tier}</span>}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-bold text-ink">{t.name}</h2>
                      {stage === "done" && <Badge tone="success" dot>Verified</Badge>}
                      {stage === "pending" && <Badge tone="warning" dot>Under review</Badge>}
                    </div>
                    {t.description && <p className="text-sm font-semibold text-ink">{t.description}</p>}
                    <p className="text-sm text-body">{tierNeeds(t, idKinds)}{t.review === "staff" ? " · checked by our team" : " · checked instantly"}</p>
                    <Unlocks t={t} products={products[t.tier] ?? []} />
                    {stage === "done" && t.tier === 1 && <p className="mt-2 text-xs text-muted">{[profile?.ninLast4 && `NIN ending ${profile.ninLast4}`, profile?.bvnLast4 && `BVN ending ${profile.bvnLast4}`, `${profile?.legalFirstName ?? ""} ${profile?.legalLastName ?? ""}`.trim()].filter(Boolean).join(" · ")}</p>}
                    {stage === "pending" && <p className="mt-3 text-sm text-warning">We&apos;re checking your details and will text you within one working day.</p>}
                  </div>
                </div>

                {stage === "current" && (
                  <div className="mt-6 border-t border-line pt-6">
                    {rejected && (
                      <p className="mb-5 flex items-start gap-2 rounded-[7px] bg-danger-soft px-4 py-3 text-sm text-danger"><AlertIcon className="mt-0.5 size-4 shrink-0" /><span><b>Last attempt wasn&apos;t approved:</b> {rejected}</span></p>
                    )}
                    {t.tier === 1 && <Tier1Form action={verifyTier1} idKinds={idKinds} />}
                    {t.tier === 2 && <NinSelfieForm action={verifyNin} ninLast4={profile?.ninLast4} />}
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
