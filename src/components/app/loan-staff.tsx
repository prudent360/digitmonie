"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { FormAlert, SubmitButton } from "@/components/auth/form-bits";
import { Field, inputClass } from "@/components/form";
import { CheckIcon, XIcon } from "@/components/icons";

type Action = (s: FormState, fd: FormData) => Promise<FormState>;

/** Approve/decline with a note; declining requires the note (it's shown to the customer). */
export function DecisionForm({ action, approveLabel }: { action: Action; approveLabel: string }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [declining, setDeclining] = useState(false);
  if (state?.notice) return <FormAlert state={state} />;
  return (
    <form action={formAction} className="space-y-3">
      <FormAlert state={state} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-ink">{declining ? "Reason for declining (the customer will see this)" : "Note (optional)"}</span>
        <textarea name="note" rows={3} required={declining} minLength={declining ? 5 : undefined} className={inputClass} placeholder={declining ? "e.g. Your repayments would be too high for your declared income." : "Anything the approver should know"} />
      </label>
      <div className="flex flex-wrap gap-2">
        {declining ? (
          <>
            <button name="decision" value="decline" disabled={pending} className="inline-flex items-center gap-2 rounded-[5px] bg-danger px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"><XIcon className="size-4" /> Confirm decline</button>
            <button type="button" onClick={() => setDeclining(false)} className="px-3 text-sm font-semibold text-body">Cancel</button>
          </>
        ) : (
          <>
            <button name="decision" value="approve" disabled={pending} className="inline-flex items-center gap-2 rounded-[5px] bg-success px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 disabled:opacity-60"><CheckIcon className="size-4" /> {approveLabel}</button>
            <button type="button" onClick={() => setDeclining(true)} className="inline-flex items-center gap-2 rounded-[5px] bg-danger-soft px-5 py-2.5 text-sm font-bold text-danger"><XIcon className="size-4" /> Decline</button>
          </>
        )}
      </div>
    </form>
  );
}

/** A small form with labelled fields and one submit button. */
export function SimpleActionForm({ action, fields, submit, tone = "brand", confirm }: {
  action: Action; submit: string; tone?: "brand" | "danger"; confirm?: string;
  fields: { name: string; label: string; placeholder?: string; inputMode?: "numeric" | "decimal" | "text"; defaultValue?: string; required?: boolean; textarea?: boolean; type?: "text" | "date" }[];
}) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }} className="space-y-3">
      <FormAlert state={state} />
      {fields.map((f) => (
        <Field key={f.name} label={f.label}>
          {f.textarea
            ? <textarea name={f.name} rows={2} className={inputClass} placeholder={f.placeholder} required={f.required ?? true} defaultValue={f.defaultValue} />
            : <input name={f.name} type={f.type ?? "text"} className={inputClass} placeholder={f.placeholder} inputMode={f.inputMode} required={f.required ?? true} defaultValue={f.defaultValue} />}
        </Field>
      ))}
      <SubmitButton arrow={false} tone={tone}>{submit}</SubmitButton>
    </form>
  );
}

/** One button that runs an action and shows its result underneath. */
export function ActionButton({ action, label, confirm, tone = "brand" }: { action: (s: FormState) => Promise<FormState>; label: string; confirm?: string; tone?: "brand" | "secondary" }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }} className="space-y-2">
      <button disabled={pending} className={`inline-flex items-center justify-center gap-2 rounded-[5px] px-5 py-2.5 text-sm font-bold disabled:opacity-60 ${tone === "brand" ? "bg-brand text-white hover:bg-brand-600" : "border border-line bg-white text-ink hover:border-brand-200"}`}>
        {pending ? "Working…" : label}
      </button>
      <FormAlert state={state} />
    </form>
  );
}

/** A select plus a save button (e.g. assigning a collector). */
export function SelectForm({ action, name, label, options, value, submit }: { action: Action; name: string; label: string; options: { value: string; label: string }[]; value: string; submit: string }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-2">
      <FormAlert state={state} />
      <div className="flex items-end gap-2">
        <Field label={label}><select name={name} defaultValue={value} className={inputClass}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
        <div className="w-28 shrink-0"><SubmitButton arrow={false}>{submit}</SubmitButton></div>
      </div>
    </form>
  );
}

export function RescheduleForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} onSubmit={(e) => { if (!window.confirm("Move every unpaid instalment? The customer will be told.")) e.preventDefault(); }} className="space-y-3">
      <FormAlert state={state} />
      <Field label="Move unpaid instalments by">
        <select name="months" defaultValue="1" className={inputClass}>{[1, 2, 3, 4, 5, 6].map((m) => <option key={m} value={m}>{m} month{m > 1 ? "s" : ""}</option>)}</select>
      </Field>
      <label className="flex items-center gap-2 text-sm text-body"><input type="checkbox" name="waive" className="size-4 accent-brand" /> Waive late fees not yet paid</label>
      <Field label="Reason"><textarea name="note" rows={2} required minLength={5} className={inputClass} placeholder="e.g. Lost job in March; new employer starts paying in May." /></Field>
      <SubmitButton arrow={false}>Reschedule</SubmitButton>
    </form>
  );
}
