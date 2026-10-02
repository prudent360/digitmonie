"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { FormAlert, SubmitButton } from "@/components/auth/form-bits";
import { Field, inputClass } from "@/components/form";

type Action = (s: FormState, fd: FormData) => Promise<FormState>;
type Option = { value: string; label: string };

export function ContactForm({ action, channels, outcomes, loans, defaultLoanId }: { action: Action; channels: Option[]; outcomes: Option[]; loans?: Option[]; defaultLoanId?: number }) {
  const [state, formAction] = useActionState(action, undefined);
  const [channel, setChannel] = useState("call");
  return (
    <form action={formAction} className="space-y-3">
      <FormAlert state={state} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="How">
          <select name="channel" value={channel} onChange={(e) => setChannel(e.target.value)} className={inputClass}>{channels.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
        </Field>
        {channel !== "note" && (
          <Field label="Outcome">
            <select name="outcome" defaultValue="" required className={inputClass}><option value="" disabled>Choose</option>{outcomes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          </Field>
        )}
      </div>
      {loans && loans.length > 0 && (
        <Field label="About loan (optional)">
          <select name="loanId" defaultValue={defaultLoanId ?? ""} className={inputClass}><option value="">Not about a specific loan</option>{loans.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</select>
        </Field>
      )}
      {!loans && defaultLoanId && <input type="hidden" name="loanId" value={defaultLoanId} />}
      <Field label="Note"><textarea name="note" rows={3} required minLength={3} maxLength={1000} className={inputClass} placeholder="What was said or agreed" /></Field>
      <SubmitButton arrow={false}>Save to contact log</SubmitButton>
    </form>
  );
}

export function StatusForm({ action, current }: { action: Action; current: string }) {
  const [state, formAction] = useActionState(action, undefined);
  const options = [
    { value: "active", label: "Active", hint: "Full access" },
    { value: "restricted", label: "Restricted", hint: "Can sign in and repay; can't borrow" },
    { value: "frozen", label: "Frozen", hint: "Can sign in and repay; can't borrow. Use for fraud or AML checks" },
    { value: "closed", label: "Closed", hint: "Can't sign in. Only when nothing is owed" },
  ].filter((o) => o.value !== current);
  return (
    <form action={formAction} className="space-y-3">
      <FormAlert state={state} />
      <div className="space-y-2">
        {options.map((o, i) => (
          <label key={o.value} className="flex cursor-pointer items-start gap-3 rounded-[5px] border border-line p-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand-50">
            <input type="radio" name="status" value={o.value} defaultChecked={i === 0} className="mt-0.5 accent-brand" />
            <span><b className="text-ink">{o.label}</b><span className="block text-xs text-muted">{o.hint}</span></span>
          </label>
        ))}
      </div>
      <Field label="Reason (kept on file; the customer is told their account changed)"><textarea name="reason" rows={2} required minLength={5} className={inputClass} /></Field>
      <SubmitButton arrow={false}>Change status</SubmitButton>
    </form>
  );
}
