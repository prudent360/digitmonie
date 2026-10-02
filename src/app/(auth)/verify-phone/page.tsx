import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resendPhoneCode, verifyPhone } from "@/app/actions/auth";
import { CodeForm } from "@/components/auth/forms";
import { getPending } from "@/lib/auth";
import { maskNgPhone } from "@/lib/phone";
import { DevCode } from "../dev-code";
import { Steps } from "../steps";

export const metadata: Metadata = { title: "Verify your phone" };

export default async function VerifyPhonePage() {
  const user = await getPending("verify_phone");
  if (!user) redirect("/login");
  return (
    <div className="page-in">
      <Steps current={2} />
      <h1 className="mt-6 font-display text-3xl font-extrabold text-ink">Verify your phone</h1>
      <p className="mt-2 text-body">We sent a 6-digit code to <b className="text-ink">{maskNgPhone(user.phone)}</b>. It expires in 10 minutes.</p>
      <div className="mt-8"><DevCode /><CodeForm action={verifyPhone} resend={resendPhoneCode} label="Verification code" submit="Verify" /></div>
    </div>
  );
}
