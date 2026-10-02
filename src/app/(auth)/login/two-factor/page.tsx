import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyTwoFactor } from "@/app/actions/auth";
import { CodeForm } from "@/components/auth/forms";
import { ShieldIcon } from "@/components/icons";
import { getPending } from "@/lib/auth";

export const metadata: Metadata = { title: "Two-factor sign-in" };

export default async function TwoFactorPage() {
  const user = await getPending("two_factor");
  if (!user) redirect("/login");
  return (
    <div className="page-in">
      <span className="flex size-12 items-center justify-center rounded-[5px] bg-brand-50 text-brand"><ShieldIcon /></span>
      <h1 className="mt-4 font-display text-3xl font-extrabold text-ink">Enter your authenticator code</h1>
      <p className="mt-2 text-body">Open your authenticator app and enter the 6-digit code for <b className="text-ink">DigitMonie ({user.email})</b>.</p>
      <div className="mt-8"><CodeForm action={verifyTwoFactor} label="Authenticator code" submit="Sign in" /></div>
      <p className="mt-6 text-center text-sm text-body">Lost your phone? Ask an administrator to reset your two-factor sign-in. <Link href="/login" className="font-semibold text-brand">Back to log in</Link></p>
    </div>
  );
}
