import type { Metadata } from "next";
import Link from "next/link";
import { changePassword, changePin, signOutEverywhere, updateProfile } from "@/app/actions/account";
import { ChangePinForm, PasswordForm, ProfileForm } from "@/components/app/account-forms";
import { Toggle } from "@/components/app/toggle";
import { CheckIcon, ClockIcon, LogoutIcon } from "@/components/icons";
import { Avatar, Badge, Card, CardHeader, PageHeader, buttonPrimary, buttonSecondary } from "@/components/ui";
import { fullName, requireCustomer } from "@/lib/auth";
import { formatDate, formatNairaWhole } from "@/lib/format";
import { KYC_TIERS } from "@/lib/kyc/tiers";
import { formatNgPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Settings & KYC" };

const TIERS = KYC_TIERS.map((t) => ({ tier: t.tier, limit: `${formatNairaWhole(t.dailyLimit)} daily`, needs: t.needs }));

export default async function SettingsPage() {
  const user = await requireCustomer();
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage your profile, verification and security." />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader title="Profile" />
          <div className="flex items-center gap-4 p-5">
            <Avatar name={fullName(user)} className="size-16 text-lg" />
            <div>
              <p className="font-bold text-ink">{fullName(user)}</p>
              <p className="text-sm text-muted">{user.email}</p>
              <p className="text-xs text-muted">Member since {formatDate(user.createdAt.toISOString(), { month: "long", year: "numeric" })}</p>
            </div>
          </div>
          <div className="px-5 pb-5">
            <ProfileForm action={updateProfile} initial={{ firstName: user.firstName, lastName: user.lastName, email: user.email }} phone={formatNgPhone(user.phone)} />
          </div>
        </Card>

        <Card>
          <div id="kyc" className="scroll-mt-24" />
          <CardHeader title="Verification (KYC)" subtitle="Higher tiers unlock bigger limits" action={<Badge tone="brand">{user.kycTier ? `Tier ${user.kycTier}` : "Not verified"}</Badge>} />
          <ol className="space-y-3 p-5">
            {TIERS.map((t) => {
              const done = user.kycTier >= t.tier;
              const next = user.kycTier + 1 === t.tier;
              return (
                <li key={t.tier} className={`flex items-center gap-4 rounded-[5px] border p-4 ${next ? "border-brand bg-brand-50/50" : "border-line"}`}>
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${done ? "bg-success text-white" : next ? "bg-brand text-white" : "bg-canvas text-muted"}`}>
                    {done ? <CheckIcon className="size-5" /> : <ClockIcon className="size-5" />}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-ink">Tier {t.tier} <span className="font-normal text-muted">· {t.limit}</span></p>
                    <p className="text-xs text-muted">{t.needs}</p>
                  </div>
                  {done ? <Badge tone="success" dot>Verified</Badge> : next ? <Link href="/dashboard/verify" className={buttonPrimary}>Start</Link> : null}
                </li>
              );
            })}
          </ol>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-[15px] font-bold text-ink">Password</h2>
          <p className="mt-1 text-xs text-muted">Changing it signs you out on your other devices.</p>
          <div className="mt-5"><PasswordForm action={changePassword} /></div>
        </Card>
        <Card className="p-5">
          <h2 className="text-[15px] font-bold text-ink">Transaction PIN</h2>
          <p className="mt-1 text-xs text-muted">Used to approve transfers, loans and withdrawals. Five wrong tries lock it for 30 minutes.</p>
          <div className="mt-5"><ChangePinForm action={changePin} hasPin={Boolean(user.pinHash)} /></div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Security" subtitle="Protect your account and money" />
        <div className="grid gap-x-10 px-5 pb-2 md:grid-cols-2">
          <div className="divide-y divide-line">
            <Toggle label="Transaction alerts" description="Email and push for every debit" defaultOn />
            <Toggle label="Hide balances by default" description="Tap the eye icon to reveal" />
          </div>
          <div className="divide-y divide-line">
            <Toggle label="Block international card payments" />
            <div className="flex flex-wrap items-center gap-3 py-4">
              <form action={signOutEverywhere}><button className={buttonSecondary}><LogoutIcon className="size-4" /> Sign out of all devices</button></form>
              {user.lastLoginAt && <span className="text-xs text-muted">Last sign-in {formatDate(user.lastLoginAt.toISOString(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
