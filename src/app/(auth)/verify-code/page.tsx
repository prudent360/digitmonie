import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resendCode, verifyCode } from "@/app/actions/auth";
import { CodeForm } from "@/components/auth/forms";
import { getPending } from "@/lib/auth";
import { codeDestinations } from "@/lib/otp";
import { DevCode } from "../dev-code";
import { Steps } from "../steps";

export const metadata: Metadata = { title: "Confirm your account" };

export default async function VerifyCodePage() {
  const user = await getPending("verify_contact");
  if (!user) redirect("/login");
  const dest = await codeDestinations(user);
  return (
    <div className="page-in">
      <Steps current={2} />
      <h1 className="mt-6 font-display text-3xl font-extrabold text-ink">{dest.email && !dest.sms ? "Check your email" : dest.sms && !dest.email ? "Check your phone" : "Enter your code"}</h1>
      <p className="mt-2 text-body">We sent a 6-digit code to <b className="text-ink">{dest.label}</b>. It expires in 10 minutes.{dest.email ? " Can't see it? Check your spam or promotions folder." : ""}</p>
      <div className="mt-8"><DevCode /><CodeForm action={verifyCode} resend={resendCode} label="Verification code" submit="Confirm" /></div>
    </div>
  );
}
