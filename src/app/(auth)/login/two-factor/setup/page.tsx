import type { Metadata } from "next";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { confirmTwoFactorSetup } from "@/app/actions/auth";
import { CodeForm } from "@/components/auth/forms";
import { getPending } from "@/lib/auth";
import { decryptSecret } from "@/lib/secrets";
import { formatSecret, otpauthUrl } from "@/lib/totp";

export const metadata: Metadata = { title: "Set up two-factor sign-in" };

export default async function TwoFactorSetupPage() {
  const user = await getPending("two_factor_setup");
  if (!user) redirect("/login");
  const secret = decryptSecret(user.totpSecret);
  if (!secret) redirect("/login");
  const qr = await QRCode.toDataURL(otpauthUrl(user.email, secret), { margin: 1, width: 220, color: { dark: "#0b1733", light: "#ffffff" } });

  return (
    <div className="page-in">
      <h1 className="font-display text-3xl font-extrabold text-ink">Protect your staff account</h1>
      <p className="mt-2 text-body">Staff accounts need a code from an authenticator app every time you sign in. It takes a minute to set up.</p>
      <ol className="mt-8 space-y-6">
        <li>
          <p className="text-sm font-bold text-ink">1. Install an authenticator app</p>
          <p className="mt-1 text-sm text-body">Google Authenticator, Microsoft Authenticator or 1Password all work.</p>
        </li>
        <li>
          <p className="text-sm font-bold text-ink">2. Scan this QR code with the app</p>
          <div className="mt-3 flex flex-wrap items-center gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL generated on the server */}
            <img src={qr} alt="QR code for your authenticator app" width={160} height={160} className="rounded-[7px] ring-1 ring-line" />
            <div className="text-sm text-body">
              <p>Can&apos;t scan it? Enter this key:</p>
              <p className="mt-1 select-all rounded-[7px] bg-canvas px-3 py-2 font-mono text-[13px] font-bold tracking-wider text-ink">{formatSecret(secret)}</p>
            </div>
          </div>
        </li>
        <li>
          <p className="mb-3 text-sm font-bold text-ink">3. Enter the 6-digit code the app shows</p>
          <CodeForm action={confirmTwoFactorSetup} label="Authenticator code" submit="Turn on and sign in" />
        </li>
      </ol>
    </div>
  );
}
