"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { FormAlert, SubmitButton } from "@/components/auth/form-bits";
import { inputClass } from "@/components/form";

const ngn = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG", { minimumFractionDigits: kobo % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

export function RepayForm({ action, loanId, options }: { action: (s: FormState, fd: FormData) => Promise<FormState>; loanId: number; options: { label: string; amount: number }[] }) {
  const [state, formAction] = useActionState(action, undefined);
  const [choice, setChoice] = useState(String(options[0]?.amount ?? "custom"));
  return (
    <form action={formAction} className="space-y-3">
      <FormAlert state={state} />
      <input type="hidden" name="loanId" value={loanId} />
      <div className="space-y-2">
        {options.map((o) => (
          <label key={o.label} className={`flex cursor-pointer items-center justify-between rounded-[7px] border px-4 py-3 text-sm ${choice === String(o.amount) ? "border-brand bg-brand-50" : "border-line"}`}>
            <span className="flex items-center gap-3"><input type="radio" name="choice" value={o.amount} checked={choice === String(o.amount)} onChange={() => setChoice(String(o.amount))} className="accent-brand" />{o.label}</span>
            <span className="font-bold tabular-nums text-ink">{ngn(o.amount)}</span>
          </label>
        ))}
        <label className={`flex cursor-pointer items-center gap-3 rounded-[7px] border px-4 py-3 text-sm ${choice === "custom" ? "border-brand bg-brand-50" : "border-line"}`}>
          <input type="radio" name="choice" value="custom" checked={choice === "custom"} onChange={() => setChoice("custom")} className="accent-brand" />
          Another amount
          {choice === "custom" && <input name="custom" inputMode="decimal" placeholder="₦" autoFocus className={`${inputClass} ml-auto w-40 py-2`} />}
        </label>
      </div>
      <SubmitButton>Pay now</SubmitButton>
      <p className="text-center text-xs text-muted">Pay by card, bank transfer or USSD on our payment partner&apos;s secure page.</p>
    </form>
  );
}

export function CancelLoanButton({ action, loanId }: { action: (s: FormState, fd: FormData) => Promise<FormState>; loanId: number }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} onSubmit={(e) => { if (!window.confirm("Cancel this loan application?")) e.preventDefault(); }}>
      <input type="hidden" name="loanId" value={loanId} />
      <button disabled={pending} className="text-sm font-semibold text-danger disabled:opacity-50">Cancel application</button>
      {state?.error && <p className="mt-1 text-xs text-danger">{state.error}</p>}
    </form>
  );
}
