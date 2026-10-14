"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { FormAlert, SubmitButton } from "@/components/auth/form-bits";
import { Field, inputClass } from "@/components/form";

/** The customer accepts a loan their credit officer prepared, with the loan terms and their PIN. */
export function AcceptOfferForm({ action }: { action: (s: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <FormAlert state={state} />
      <label className="flex items-start gap-3 text-sm text-body">
        <input type="checkbox" name="acceptTerms" required className="mt-0.5 size-4 shrink-0 accent-brand" />
        <span>I&apos;ve read the key facts and repayment plan, I asked for this loan, and I agree to the <a href="/loan-terms" target="_blank" rel="noopener" className="font-semibold text-brand">Loan Terms</a>. I understand DigitMonie will check my credit record and report this loan to licensed credit bureaus.</span>
      </label>
      <Field label="Transaction PIN"><input className={`${inputClass} font-display text-lg tracking-[.5em]`} type="password" name="pin" inputMode="numeric" maxLength={4} pattern="\d{4}" required /></Field>
      <SubmitButton>Accept and send for approval</SubmitButton>
    </form>
  );
}
