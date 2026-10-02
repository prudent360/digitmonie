"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { FormAlert, SubmitButton } from "@/components/auth/form-bits";
import { Field, inputClass } from "@/components/form";
import { LockIcon } from "@/components/icons";

type State = Record<string, { value: string | number | boolean; source: string; secretHint?: string }>;

function Secret({ name, label, s, placeholder }: { name: string; label: string; s: State[string]; placeholder: string }) {
  return (
    <div>
      <Field label={label}>
        <span className="relative block">
          <LockIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input name={name} type="password" autoComplete="off" placeholder={s.secretHint ? `Saved (${s.secretHint}). Type to replace.` : placeholder} className={`${inputClass} pl-10 font-mono`} />
        </span>
      </Field>
      {s.source === "saved" && <label className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-danger"><input type="checkbox" name={`${name}__clear`} className="accent-danger" /> Remove saved value</label>}
      {s.source === "env" && <p className="mt-1.5 text-xs text-muted">Currently from the server environment. A value saved here takes priority.</p>}
    </div>
  );
}

/** Settings → Email: how codes go out, and Resend / SMTP / log-only delivery (like the academy). */
export function EmailSettingsForm({ action, state: s, from }: { action: (st: FormState, fd: FormData) => Promise<FormState>; state: State; from: string }) {
  const [result, formAction] = useActionState(action, undefined);
  const [driver, setDriver] = useState(String(s.emailDriver.value));
  const v = (k: string) => String(s[k]?.value ?? "");
  const drivers = [
    { id: "resend", label: "Resend", hint: "Easiest. Verify your domain in Resend." },
    { id: "smtp", label: "Your mail server (SMTP)", hint: "Hostinger, Google Workspace, Zoho…" },
    { id: "log", label: "Don't send (log only)", hint: "For testing. Nothing leaves the server." },
  ];
  return (
    <form action={formAction} className="space-y-7">
      <FormAlert state={result} />

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-ink">One-time codes</h3>
        <Field label="Send codes for new accounts and password resets by">
          <select name="otpChannel" defaultValue={v("otpChannel")} className={inputClass}>
            <option value="email">Email</option>
            <option value="sms">SMS (Termii)</option>
            <option value="both">Email and SMS</option>
          </select>
        </Field>
        <p className="text-xs text-muted">With email, signing up confirms the customer&apos;s email address. Customers without a phone number always get codes by email.</p>
      </section>

      <section className="space-y-4 border-t border-line pt-6">
        <h3 className="text-sm font-bold text-ink">Delivery</h3>
        <input type="hidden" name="emailDriver" value={driver} />
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Send email with">
          {drivers.map((d) => (
            <button key={d.id} type="button" role="radio" aria-checked={driver === d.id} onClick={() => setDriver(d.id)} className={`rounded-[5px] border p-3 text-left transition ${driver === d.id ? "border-brand bg-brand-50 ring-2 ring-brand-100" : "border-line hover:border-brand-200"}`}>
              <span className="block text-sm font-bold text-ink">{d.label}</span>
              <span className="mt-0.5 block text-xs text-muted">{d.hint}</span>
            </button>
          ))}
        </div>

        {/* Inactive driver fields stay in the form (hidden) so their saved values are kept. */}
        <div className={driver === "resend" ? "space-y-2" : "hidden"}>
          <Secret name="resendApiKey" label="Resend API key" s={s.resendApiKey} placeholder="re_…" />
          <p className="text-xs text-muted">Create a key at <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand">resend.com/api-keys</a> and verify your domain under Domains, so emails come from your own address.</p>
        </div>
        <div className={driver === "smtp" ? "space-y-4" : "hidden"}>
          <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
            <Field label="Host"><input name="smtpHost" defaultValue={v("smtpHost")} placeholder="smtp.hostinger.com" className={`${inputClass} font-mono text-sm`} /></Field>
            <Field label="Port"><input name="smtpPort" inputMode="numeric" defaultValue={v("smtpPort")} className={inputClass} /></Field>
            <Field label="Encryption">
              <select name="smtpSecurity" defaultValue={v("smtpSecurity")} className={inputClass}><option value="ssl">SSL (port 465)</option><option value="tls">TLS (port 587)</option><option value="none">None</option></select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Username"><input name="smtpUser" defaultValue={v("smtpUser")} placeholder="hello@digitmonie.com" autoComplete="off" className={inputClass} /></Field>
            <Secret name="smtpPassword" label="Password" s={s.smtpPassword} placeholder="Mailbox password" />
          </div>
          <p className="text-xs text-muted"><b className="text-body">Hostinger:</b> smtp.hostinger.com, 465, SSL, your full mailbox address and its password. <b className="text-body">Google Workspace:</b> smtp.gmail.com, 587, TLS, with an App Password.</p>
        </div>
        {driver === "log" && <p className="rounded-[5px] bg-warning-soft px-4 py-3 text-sm text-warning">Emails are written to the log below and never delivered, including verification codes. Only use this while testing.</p>}

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Sender name"><input name="emailFromName" defaultValue={v("emailFromName")} className={inputClass} /></Field>
          <Field label="Sender address"><input name="emailFromAddress" type="email" defaultValue={v("emailFromAddress")} placeholder="hello@digitmonie.com" className={inputClass} /></Field>
          <Field label="Reply-to"><input name="emailReplyTo" type="email" defaultValue={v("emailReplyTo")} placeholder="support@digitmonie.com" className={inputClass} /></Field>
        </div>
        <p className="text-sm text-muted">Emails currently go out as <b className="text-ink">{from}</b>.</p>
      </section>

      <div className="w-48"><SubmitButton arrow={false}>Save email settings</SubmitButton></div>
    </form>
  );
}
