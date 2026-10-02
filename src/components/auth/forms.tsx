"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { Field, inputClass } from "@/components/form";
import { CodeInput, FormAlert, SubmitButton } from "./form-bits";

type Action = (state: FormState, fd: FormData) => Promise<FormState>;

export function LoginForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-5">
      <FormAlert state={state} />
      <Field label="Phone number or email">
        <input className={inputClass} name="identifier" defaultValue={state?.fields?.identifier} placeholder="0803 000 0000 or you@example.com" autoComplete="username" required autoFocus />
      </Field>
      <Field label="Password" hint={<Link href="/forgot-password" className="text-xs font-semibold text-brand">Forgot password?</Link>}>
        <input className={inputClass} type="password" name="password" placeholder="••••••••••" autoComplete="current-password" required />
      </Field>
      <SubmitButton>Log in</SubmitButton>
    </form>
  );
}

export function RegisterForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, undefined);
  const f = state?.fields ?? {};
  return (
    <form action={formAction} className="space-y-5">
      <FormAlert state={state} />
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name"><input className={inputClass} name="firstName" defaultValue={f.firstName} autoComplete="given-name" required /></Field>
        <Field label="Last name"><input className={inputClass} name="lastName" defaultValue={f.lastName} autoComplete="family-name" required /></Field>
      </div>
      <Field label="Phone number">
        <div className="flex">
          <span className="flex items-center rounded-l-[5px] border border-r-0 border-line bg-canvas px-3.5 text-sm font-semibold text-body">🇳🇬 +234</span>
          <input className={`${inputClass} rounded-l-none`} name="phone" defaultValue={f.phone} inputMode="tel" placeholder="803 000 0000" autoComplete="tel-national" required />
        </div>
      </Field>
      <Field label="Email address"><input className={inputClass} type="email" name="email" defaultValue={f.email} autoComplete="email" required /></Field>
      <Field label="Create password" hint={<span className="text-xs font-normal text-muted">At least 10 characters</span>}>
        <input className={inputClass} type="password" name="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Field label="Referral code (optional)"><input className={inputClass} name="referral" defaultValue={f.referral} /></Field>
      <label className="flex items-start gap-3 text-sm text-body">
        <input type="checkbox" name="terms" required className="mt-0.5 size-4 accent-brand" />
        <span>I agree to the <Link href="/terms" target="_blank" className="font-semibold text-brand">Terms</Link>, <Link href="/privacy" target="_blank" className="font-semibold text-brand">Privacy Policy</Link> and <Link href="/loan-terms" target="_blank" className="font-semibold text-brand">Loan Terms</Link>.</span>
      </label>
      <SubmitButton>Continue</SubmitButton>
    </form>
  );
}

/** A single code field, plus an optional "send a new code" button. */
export function CodeForm({ action, resend, label, submit, length = 6 }: { action: Action; resend?: Action; label: string; submit: string; length?: number }) {
  const [state, formAction] = useActionState(action, undefined);
  const [resendState, resendAction, resending] = useActionState(resend ?? (async () => undefined), undefined);
  return (
    <div className="space-y-4">
      <FormAlert state={state ?? resendState} />
      <form action={formAction} className="space-y-5">
        <CodeInput label={label} length={length} />
        <SubmitButton>{submit}</SubmitButton>
      </form>
      {resend && (
        <form action={resendAction} className="text-center">
          <button disabled={resending} className="text-sm font-semibold text-brand disabled:opacity-50">Didn&apos;t get it? Send a new code</button>
        </form>
      )}
    </div>
  );
}

export function PinForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-5">
      <FormAlert state={state} />
      <CodeInput name="pin" label="New 4-digit PIN" length={4} />
      <CodeInput name="confirm" label="Enter it again" length={4} autoFocus={false} />
      <SubmitButton>Save PIN</SubmitButton>
    </form>
  );
}

export function ForgotForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-5">
      <FormAlert state={state} />
      <Field label="Phone number or email">
        <input className={inputClass} name="identifier" defaultValue={state?.fields?.identifier} autoComplete="username" required autoFocus />
      </Field>
      <SubmitButton>Send code</SubmitButton>
    </form>
  );
}

/** New password + confirmation, with an optional code field first (password reset). */
export function NewPasswordForm({ action, withCode = false, resend, submit }: { action: Action; withCode?: boolean; resend?: Action; submit: string }) {
  const [state, formAction] = useActionState(action, undefined);
  const [resendState, resendAction, resending] = useActionState(resend ?? (async () => undefined), undefined);
  return (
    <div className="space-y-4">
      <FormAlert state={state ?? resendState} />
      <form action={formAction} className="space-y-5">
        {withCode && <CodeInput label="6-digit code" />}
        <Field label="New password" hint={<span className="text-xs font-normal text-muted">At least 10 characters</span>}>
          <input className={inputClass} type="password" name="password" autoComplete="new-password" minLength={10} required autoFocus={!withCode} />
        </Field>
        <Field label="Confirm password"><input className={inputClass} type="password" name="confirm" autoComplete="new-password" minLength={10} required /></Field>
        <SubmitButton>{submit}</SubmitButton>
      </form>
      {resend && (
        <form action={resendAction} className="text-center">
          <button disabled={resending} className="text-sm font-semibold text-brand disabled:opacity-50">Send a new code</button>
        </form>
      )}
    </div>
  );
}
