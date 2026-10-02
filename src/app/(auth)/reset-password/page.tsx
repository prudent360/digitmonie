import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resendResetCode, resetPassword } from "@/app/actions/auth";
import { NewPasswordForm } from "@/components/auth/forms";
import { getPending } from "@/lib/auth";
import { codeDestinations } from "@/lib/otp";
import { DevCode } from "../dev-code";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const user = await getPending("reset_password");
  if (!user) redirect("/forgot-password");
  const dest = await codeDestinations(user);
  return (
    <div className="page-in">
      <h1 className="font-display text-3xl font-extrabold text-ink">Choose a new password</h1>
      <p className="mt-2 text-body">Enter the code we sent to <b className="text-ink">{dest.label}</b>. You&apos;ll be signed out on all your devices.</p>
      <div className="mt-8"><DevCode /><NewPasswordForm action={resetPassword} resend={resendResetCode} withCode submit="Change password" /></div>
    </div>
  );
}
