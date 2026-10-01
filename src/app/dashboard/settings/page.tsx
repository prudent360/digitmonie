import type { Metadata } from "next";
import { Toggle } from "@/components/app/toggle";
import { Field, inputClass } from "@/components/form";
import { CheckIcon, ClockIcon, LockIcon } from "@/components/icons";
import { Avatar, Badge, Card, CardHeader, PageHeader, buttonPrimary, buttonSecondary } from "@/components/ui";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Settings & KYC" };

const TIERS = [
  { tier: "Tier 1", limit: "₦50,000 daily", needs: "Phone number & BVN", state: "done" },
  { tier: "Tier 2", limit: "₦500,000 daily", needs: "NIN & selfie", state: "done" },
  { tier: "Tier 3", limit: "₦50,000,000 daily", needs: "Proof of address", state: "current" },
] as const;

export default async function SettingsPage() {
  const session = await requireSession();
  return (
    <div className="space-y-6">
      <PageHeader title="Settings & KYC" subtitle="Manage your profile, verification and security." />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader title="Profile" />
          <div className="flex items-center gap-4 p-5">
            <Avatar name={session.name} className="size-16 text-lg" />
            <div>
              <p className="font-bold text-ink">{session.name}</p>
              <p className="text-sm text-muted">{session.email}</p>
              <button type="button" className="mt-1 text-xs font-semibold text-brand">Change photo</button>
            </div>
          </div>
          <form className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
            <Field label="Full name"><input className={inputClass} defaultValue={session.name} /></Field>
            <Field label="Phone"><input className={inputClass} defaultValue="0803 451 5531" /></Field>
            <div className="sm:col-span-2"><Field label="Email"><input className={inputClass} defaultValue={session.email} /></Field></div>
            <div className="sm:col-span-2"><Field label="Residential address"><input className={inputClass} defaultValue="12 Admiralty Way, Lekki Phase 1, Lagos" /></Field></div>
            <div className="sm:col-span-2"><button type="button" className={buttonPrimary}>Save changes</button></div>
          </form>
        </Card>

        <Card>
          <div id="kyc" className="scroll-mt-24" />
          <CardHeader title="Verification (KYC)" subtitle="Higher tiers unlock bigger limits" action={<Badge tone="brand">Tier 2</Badge>} />
          <ol className="space-y-3 p-5">
            {TIERS.map((t) => (
              <li key={t.tier} className={`flex items-center gap-4 rounded-2xl border p-4 ${t.state === "current" ? "border-brand bg-brand-50/50" : "border-line"}`}>
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${t.state === "done" ? "bg-success text-white" : "bg-brand text-white"}`}>
                  {t.state === "done" ? <CheckIcon className="size-5" /> : <ClockIcon className="size-5" />}
                </span>
                <div className="flex-1">
                  <p className="font-bold text-ink">{t.tier} <span className="font-normal text-muted">· {t.limit}</span></p>
                  <p className="text-xs text-muted">{t.needs}</p>
                </div>
                {t.state === "done" ? <Badge tone="success" dot>Verified</Badge> : <button type="button" className={buttonPrimary}>Upload</button>}
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card>
        <CardHeader title="Security" subtitle="Protect your account and money" />
        <div className="grid gap-x-10 px-5 pb-2 md:grid-cols-2">
          <div className="divide-y divide-line">
            <Toggle label="Biometric login" description="Use Face ID or fingerprint to sign in" defaultOn />
            <Toggle label="Two-factor authentication" description="One-time code for new devices" defaultOn />
            <Toggle label="Transaction alerts" description="Email and push for every debit" defaultOn />
          </div>
          <div className="divide-y divide-line">
            <Toggle label="Hide balances by default" description="Tap the eye icon to reveal" />
            <Toggle label="Block international card payments" />
            <div className="flex flex-wrap gap-2 py-4">
              <button type="button" className={buttonSecondary}><LockIcon className="size-4" /> Change PIN</button>
              <button type="button" className={buttonSecondary}>Change password</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
