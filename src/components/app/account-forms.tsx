"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { FormAlert, SubmitButton } from "@/components/auth/form-bits";
import { Field, inputClass } from "@/components/form";

type Action = (state: FormState, fd: FormData) => Promise<FormState>;

export function ProfileForm({ action, initial, phone }: { action: Action; initial: { firstName: string; lastName: string; email: string }; phone: string }) {
  const [state, formAction] = useActionState(action, undefined);
  const v = { ...initial, ...state?.fields };
  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormAlert state={state} /></div>
      <Field label="First name"><input className={inputClass} name="firstName" defaultValue={v.firstName} required /></Field>
      <Field label="Last name"><input className={inputClass} name="lastName" defaultValue={v.lastName} required /></Field>
      <div className="sm:col-span-2"><Field label="Email"><input className={inputClass} type="email" name="email" defaultValue={v.email} required /></Field></div>
      <div className="sm:col-span-2">
        <Field label="Phone number" hint={<span className="text-xs font-normal text-muted">Contact support to change</span>}>
          <input className={`${inputClass} bg-canvas text-muted`} value={phone} readOnly />
        </Field>
      </div>
      <div className="sm:col-span-2 sm:w-48"><SubmitButton arrow={false}>Save changes</SubmitButton></div>
    </form>
  );
}

export function PasswordForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <FormAlert state={state} />
      <Field label="Current password"><input className={inputClass} type="password" name="current" autoComplete="current-password" required /></Field>
      <Field label="New password"><input className={inputClass} type="password" name="password" autoComplete="new-password" minLength={10} required /></Field>
      <Field label="Confirm new password"><input className={inputClass} type="password" name="confirm" autoComplete="new-password" minLength={10} required /></Field>
      <SubmitButton arrow={false}>Change password</SubmitButton>
    </form>
  );
}

const pinInput = `${inputClass} font-display text-lg tracking-[.5em]`;
export function ChangePinForm({ action, hasPin }: { action: Action; hasPin: boolean }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <FormAlert state={state} />
      {hasPin && <Field label="Current PIN"><input className={pinInput} type="password" name="current" inputMode="numeric" maxLength={4} pattern="\d{4}" required /></Field>}
      <div className="grid grid-cols-2 gap-4">
        <Field label="New PIN"><input className={pinInput} type="password" name="pin" inputMode="numeric" maxLength={4} pattern="\d{4}" required /></Field>
        <Field label="Confirm"><input className={pinInput} type="password" name="confirm" inputMode="numeric" maxLength={4} pattern="\d{4}" required /></Field>
      </div>
      <SubmitButton arrow={false}>{hasPin ? "Change PIN" : "Create PIN"}</SubmitButton>
    </form>
  );
}
