"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { FormAlert, SubmitButton } from "@/components/auth/form-bits";
import { Field, inputClass } from "@/components/form";

type Action = (s: FormState, fd: FormData) => Promise<FormState>;

export function RunForm({ action, defaultDate, max }: { action: Action; defaultDate: string; max: string }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-3">
      <FormAlert state={state} />
      <div className="flex items-end gap-2">
        <Field label="Day (Lagos time)"><input type="date" name="date" defaultValue={defaultDate} max={max} required className={inputClass} /></Field>
        <div className="w-40 shrink-0"><SubmitButton arrow={false}>Reconcile</SubmitButton></div>
      </div>
    </form>
  );
}

export function ResolveForm({ action, canRecheck }: { action: Action; canRecheck: boolean }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  if (state?.notice) return <FormAlert state={state} />;
  return (
    <form action={formAction} className="space-y-2">
      <FormAlert state={state} />
      <textarea name="note" rows={2} placeholder="What you found and did" className={`${inputClass} text-sm`} />
      <div className="flex flex-wrap gap-2">
        {canRecheck && <button name="recheck" value="1" disabled={pending} className="rounded-[7px] bg-brand px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60">Re-check with Flutterwave and apply</button>}
        <button name="recheck" value="0" disabled={pending} className="rounded-[7px] border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink disabled:opacity-60">Mark resolved</button>
      </div>
    </form>
  );
}

export function FundingForm({ action, today }: { action: Action; today: string }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-3">
      <FormAlert state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Account"><select name="account" className={inputClass}><option value="flutterwave">Flutterwave balance</option><option value="bank">Company bank account</option></select></Field>
        <Field label="Direction"><select name="direction" className={inputClass}><option value="in">Money put in (funding)</option><option value="out">Money taken out</option></select></Field>
        <Field label="Amount (₦)"><input name="amount" inputMode="decimal" required className={inputClass} /></Field>
        <Field label="Date"><input type="date" name="date" defaultValue={today} max={today} required className={inputClass} /></Field>
      </div>
      <Field label="Reference or note"><input name="note" required placeholder="e.g. Transfer from GTBank, ref 000123…" className={inputClass} /></Field>
      <SubmitButton arrow={false}>Record in ledger</SubmitButton>
    </form>
  );
}
