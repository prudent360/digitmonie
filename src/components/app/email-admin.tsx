"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { FormAlert, SubmitButton } from "@/components/auth/form-bits";
import { Field, inputClass } from "@/components/form";

/** Subject + Markdown body editor for one template. */
export function TemplateEditor({ action, subject, body }: { action: (s: FormState, fd: FormData) => Promise<FormState>; subject: string; body: string }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <FormAlert state={state} />
      <Field label="Subject"><input name="subject" defaultValue={subject} required maxLength={200} className={inputClass} /></Field>
      <Field label="Body"><textarea name="body" defaultValue={body} rows={16} required className={`${inputClass} font-mono text-[13px] leading-relaxed`} /></Field>
      <div className="w-44"><SubmitButton arrow={false}>Save template</SubmitButton></div>
    </form>
  );
}
