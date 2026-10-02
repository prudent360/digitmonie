"use client";

import { useActionState, useState, useTransition } from "react";
import type { FormState } from "@/app/actions/auth";
import { FormAlert, SubmitButton } from "@/components/auth/form-bits";
import { inputClass } from "@/components/form";
import { CheckIcon, LockIcon, XIcon } from "@/components/icons";
import type { Integration, Section } from "@/lib/settings/definitions";

type FieldState = { value: string | number | boolean; source: "saved" | "env" | "default"; secretHint?: string };

const LABEL: Record<Integration, string> = { flutterwave: "Flutterwave", paystack: "Paystack", dojah: "Dojah", termii: "Termii", resend: "Resend" };

function Source({ s }: { s: FieldState }) {
  if (s.source === "env") return <span className="rounded-[3px] bg-canvas px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">from server environment</span>;
  if (s.source === "default" && s.value === "") return null;
  if (s.source === "default") return <span className="rounded-[3px] bg-canvas px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">default</span>;
  return null;
}

function TestButton({ kind, test }: { kind: Integration; test: (k: Integration) => Promise<{ ok: boolean; message: string }> }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={pending} onClick={() => start(async () => setResult(await test(kind)))} className="rounded-[7px] border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:border-brand-200 disabled:opacity-60">
        {pending ? "Testing…" : `Test ${LABEL[kind]} connection`}
      </button>
      {result && (
        <span className={`flex items-center gap-1.5 text-sm font-medium ${result.ok ? "text-success" : "text-danger"}`}>
          {result.ok ? <CheckIcon className="size-4" /> : <XIcon className="size-4" />}{result.message}
        </span>
      )}
    </div>
  );
}

export function SettingsForm({ section, state: fields, action, test }: {
  section: Section;
  state: Record<string, FieldState>;
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  test: (k: Integration) => Promise<{ ok: boolean; message: string }>;
}) {
  const [result, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-6">
      <FormAlert state={result} />
      {section.fields.map((f) => {
        const s = fields[f.key];
        const label = (
          <span className="mb-1.5 flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">{f.label}<Source s={s} /></span>
        );
        const help = f.help && <span className="mt-1.5 block text-xs text-muted">{f.help}</span>;

        if (f.type === "boolean") {
          return (
            <label key={f.key} className="flex cursor-pointer items-start justify-between gap-6 rounded-[7px] border border-line p-4">
              <span><span className="block text-sm font-semibold text-ink">{f.label}</span>{help}</span>
              <input type="checkbox" name={f.key} defaultChecked={Boolean(s.value)} className="peer sr-only" />
              <span className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-line transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:bg-brand peer-checked:after:left-[22px] peer-focus-visible:ring-4 peer-focus-visible:ring-brand-100" />
            </label>
          );
        }
        if (f.type === "secret") {
          return (
            <div key={f.key}>
              <label className="block">
                {label}
                <span className="relative block">
                  <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                  <input name={f.key} type="password" autoComplete="off" spellCheck={false} placeholder={s.secretHint ? `Saved (${s.secretHint}). Type to replace.` : "Not set"} className={`${inputClass} pl-10 font-mono`} />
                </span>
              </label>
              <span className="mt-1.5 flex flex-wrap items-center gap-4">
                {s.source === "saved" && <label className="flex items-center gap-2 text-xs font-semibold text-danger"><input type="checkbox" name={`${f.key}__clear`} className="accent-danger" /> Remove saved key</label>}
                {help}
              </span>
            </div>
          );
        }
        if (f.type === "select") {
          return (
            <label key={f.key} className="block">
              {label}
              <select name={f.key} defaultValue={String(s.value)} className={inputClass}>{f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
              {help}
            </label>
          );
        }
        const prefix = f.type === "naira" ? "₦" : null;
        const suffix = f.type === "percent" ? "%" : null;
        return (
          <label key={f.key} className="block">
            {label}
            <span className="relative block">
              {prefix && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-muted">{prefix}</span>}
              <input name={f.key} defaultValue={f.type === "naira" ? Number(s.value).toLocaleString("en-NG") : String(s.value)} inputMode={f.type === "text" ? "text" : "decimal"} className={`${inputClass} ${prefix ? "pl-8" : ""} ${suffix ? "pr-10" : ""}`} />
              {suffix && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-muted">{suffix}</span>}
            </span>
            {help}
          </label>
        );
      })}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
        <div className="space-y-2">{section.tests?.map((k) => <TestButton key={k} kind={k} test={test} />)}</div>
        <div className="w-44"><SubmitButton arrow={false}>Save</SubmitButton></div>
      </div>
      {section.tests?.length ? <p className="text-xs text-muted">Save first, then test. Tests only read from the provider; they never move money or send messages.</p> : null}
    </form>
  );
}
