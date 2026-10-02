"use client";

import { Fragment, useActionState, useState } from "react";
import type { TeamState } from "@/app/actions/team";
import { FormAlert, SubmitButton } from "@/components/auth/form-bits";
import { Field, inputClass } from "@/components/form";
import { CheckIcon, CopyIcon } from "@/components/icons";
import type { Permission } from "@/lib/permissions";

type Action = (state: TeamState, fd: FormData) => Promise<TeamState>;
type RoleOption = { key: string; name: string };

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 rounded-[5px] border border-dashed border-brand-200 bg-brand-50/60 p-3">
      <p className="text-xs font-semibold text-brand">Invitation link (also emailed). Share it securely; it works once and expires in 7 days.</p>
      <div className="mt-2 flex gap-2">
        <input readOnly value={url} className="min-w-0 flex-1 rounded-[5px] border border-line bg-white px-3 py-2 font-mono text-xs text-ink" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }} className="flex items-center gap-1.5 rounded-[5px] bg-brand px-3 text-xs font-bold text-white">
          {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}{copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export function InviteForm({ action, roles }: { action: Action; roles: RoleOption[] }) {
  const [state, formAction] = useActionState(action, undefined);
  const f = state?.fields ?? {};
  return (
    <form action={formAction} className="space-y-4">
      <FormAlert state={state} />
      {state?.inviteUrl && <CopyLink url={state.inviteUrl} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name"><input className={inputClass} name="firstName" defaultValue={f.firstName} required /></Field>
        <Field label="Last name"><input className={inputClass} name="lastName" defaultValue={f.lastName} required /></Field>
      </div>
      <Field label="Work email"><input className={inputClass} type="email" name="email" defaultValue={f.email} required /></Field>
      <Field label="Role">
        <select name="roleKey" className={inputClass} defaultValue={f.roleKey ?? roles.find((r) => r.key === "staff")?.key}>
          {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
        </select>
      </Field>
      <SubmitButton>Send invitation</SubmitButton>
    </form>
  );
}

/** A one-button form for a row action, with its result shown underneath. */
export function RowAction({ action, fields, label, tone = "brand", confirm }: { action: Action; fields: Record<string, string>; label: string; tone?: "brand" | "danger"; confirm?: string }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }} className="inline-block text-left">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button disabled={pending} className={`text-sm font-semibold disabled:opacity-50 ${tone === "danger" ? "text-danger" : "text-brand"}`}>{pending ? "…" : label}</button>
      {state?.error && <p className="mt-1 max-w-56 text-xs text-danger">{state.error}</p>}
      {state?.notice && !state.inviteUrl && <p className="mt-1 max-w-56 text-xs text-success">{state.notice}</p>}
      {state?.inviteUrl && <div className="w-80"><CopyLink url={state.inviteUrl} /></div>}
    </form>
  );
}

/** Changes a member's role as soon as a new one is picked. */
export function RoleSelect({ action, userId, current, roles }: { action: Action; userId: number; current: string; roles: RoleOption[] }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />
      <select name="roleKey" defaultValue={current} disabled={pending} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="rounded-[5px] border border-line bg-white px-2.5 py-1.5 text-sm font-semibold text-ink outline-none focus:border-brand">
        {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
      </select>
      {state?.error && <p className="mt-1 max-w-56 text-xs text-danger">{state.error}</p>}
    </form>
  );
}

type MatrixRole = { key: string; name: string; permissions: Permission[]; locked: boolean; members: number };
type Group = { title: string; items: { key: Permission; label: string; hint: string }[] };

/** Roles across the top, permissions down the side; one save for everything. */
export function PermissionMatrix({ action, roles, groups }: { action: Action; roles: MatrixRole[]; groups: Group[] }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left">
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted">Permission</th>
              {roles.map((r) => (
                <th key={r.key} className="px-4 py-3 text-center">
                  <span className="block font-bold text-ink">{r.name}</span>
                  <span className="block text-xs font-normal text-muted">{r.members} member{r.members === 1 ? "" : "s"}{r.locked ? " · all access" : ""}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.title}>
                <tr><td colSpan={roles.length + 1} className="bg-canvas px-5 py-2 text-xs font-bold uppercase tracking-wide text-muted">{g.title}</td></tr>
                {g.items.map((p) => (
                  <tr key={p.key} className="border-b border-line last:border-0">
                    <td className="px-5 py-3"><p className="font-semibold text-ink">{p.label}</p><p className="text-xs text-muted">{p.hint}</p></td>
                    {roles.map((r) => (
                      <td key={r.key} className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          name={`perm:${r.key}`}
                          value={p.key}
                          defaultChecked={r.locked || r.permissions.includes(p.key)}
                          disabled={r.locked || p.key === "console.access"}
                          aria-label={`${r.name}: ${p.label}`}
                          className="size-4 accent-brand disabled:opacity-60"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-5">
        <div className="min-w-0 flex-1"><FormAlert state={state} /></div>
        <div className="w-44"><SubmitButton arrow={false}>Save permissions</SubmitButton></div>
      </div>
    </form>
  );
}

export function CreateRoleForm({ action, roles }: { action: Action; roles: RoleOption[] }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <FormAlert state={state} />
      <Field label="Role name"><input className={inputClass} name="name" defaultValue={state?.fields?.name} placeholder="e.g. Customer support" required /></Field>
      <Field label="What they do (optional)"><input className={inputClass} name="description" defaultValue={state?.fields?.description} /></Field>
      <Field label="Start with the permissions of">
        <select name="copyFrom" className={inputClass} defaultValue="">
          <option value="">No permissions (console access only)</option>
          {roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
        </select>
      </Field>
      <SubmitButton arrow={false}>Create role</SubmitButton>
    </form>
  );
}

