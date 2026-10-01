import type { Metadata } from "next";
import Link from "next/link";
import { demoSignIn } from "@/app/actions/auth";
import { Field, inputClass } from "@/components/form";
import { ArrowRightIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Open an account" };

export default function RegisterPage() {
  return (
    <div className="page-in">
      <p className="text-sm font-bold text-brand">Step 1 of 3</p>
      <div className="mt-2 flex gap-1.5">{[1, 2, 3].map((s) => <span key={s} className={`h-1.5 flex-1 rounded-full ${s === 1 ? "bg-brand" : "bg-line"}`} />)}</div>
      <h1 className="mt-6 font-display text-3xl font-extrabold text-ink">Open your free account</h1>
      <p className="mt-2 text-body">It takes less than 2 minutes. You&apos;ll verify your BVN next.</p>

      <form action={demoSignIn} className="mt-8 space-y-5">
        <input type="hidden" name="role" value="customer" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name"><input className={inputClass} name="firstName" autoComplete="given-name" /></Field>
          <Field label="Last name"><input className={inputClass} name="lastName" autoComplete="family-name" /></Field>
        </div>
        <Field label="Phone number">
          <div className="flex">
            <span className="flex items-center rounded-l-xl border border-r-0 border-line bg-canvas px-3.5 text-sm font-semibold text-body">🇳🇬 +234</span>
            <input className={`${inputClass} rounded-l-none`} name="phone" inputMode="tel" placeholder="803 000 0000" autoComplete="tel-national" />
          </div>
        </Field>
        <Field label="Email address"><input className={inputClass} type="email" name="email" autoComplete="email" /></Field>
        <Field label="Create password"><input className={inputClass} type="password" name="password" autoComplete="new-password" /></Field>
        <Field label="Referral code (optional)"><input className={inputClass} name="referral" /></Field>
        <label className="flex items-start gap-3 text-sm text-body">
          <input type="checkbox" required className="mt-0.5 size-4 accent-brand" />
          <span>I agree to the <Link href="#" className="font-semibold text-brand">Terms</Link> and <Link href="#" className="font-semibold text-brand">Privacy Policy</Link>.</span>
        </label>
        <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 font-bold text-white transition hover:bg-brand-600">
          Continue <ArrowRightIcon className="size-4" />
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-body">Already have an account? <Link href="/login" className="font-semibold text-brand">Log in</Link></p>
    </div>
  );
}
