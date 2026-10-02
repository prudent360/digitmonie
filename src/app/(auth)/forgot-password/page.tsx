import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";
import { ForgotForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div className="page-in">
      <h1 className="font-display text-3xl font-extrabold text-ink">Forgot your password?</h1>
      <p className="mt-2 text-body">Enter the phone number or email on your account and we&apos;ll send you a code to reset it.</p>
      <div className="mt-8"><ForgotForm action={requestPasswordReset} /></div>
      <p className="mt-6 text-center text-sm text-body"><Link href="/login" className="font-semibold text-brand">Back to log in</Link></p>
    </div>
  );
}
