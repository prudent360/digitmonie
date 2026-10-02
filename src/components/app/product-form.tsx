"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";
import { FormAlert, SubmitButton } from "@/components/auth/form-bits";
import { Field, inputClass } from "@/components/form";

export type ProductValues = {
  id?: number; name: string; description: string; minAmount: string; maxAmount: string; tenors: string; monthlyRate: string;
  interestMethod: "reducing" | "flat"; processingFee: string; lateFee: string; minKycTier: string; statementAbove: string; autoApproveUpTo: string; active: boolean;
};

export function LoanProductForm({ action, initial }: { action: (s: FormState, fd: FormData) => Promise<FormState>; initial: ProductValues }) {
  const [state, formAction] = useActionState(action, undefined);
  const v = { ...initial, ...(state?.fields as Partial<ProductValues> | undefined) };
  const num = (name: keyof ProductValues, label: string, hint?: string) => (
    <Field label={label} hint={hint ? <span className="text-xs font-normal text-muted">{hint}</span> : undefined}>
      <input name={name} defaultValue={String(v[name] ?? "")} inputMode="decimal" className={inputClass} />
    </Field>
  );
  return (
    <form action={formAction} className="space-y-4">
      <FormAlert state={state} />
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name"><input name="name" defaultValue={v.name} required className={inputClass} /></Field>
        <Field label="Minimum KYC tier">
          <select name="minKycTier" defaultValue={v.minKycTier} className={inputClass}>{[1, 2, 3].map((t) => <option key={t} value={t}>Tier {t}</option>)}</select>
        </Field>
      </div>
      <Field label="Description"><input name="description" defaultValue={v.description} className={inputClass} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        {num("minAmount", "Min amount (₦)")}
        {num("maxAmount", "Max amount (₦)")}
        <Field label="Repayment periods" hint={<span className="text-xs font-normal text-muted">months</span>}><input name="tenors" defaultValue={v.tenors} placeholder="1, 2, 3" className={inputClass} /></Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {num("monthlyRate", "Interest % a month")}
        <Field label="Method">
          <select name="interestMethod" defaultValue={v.interestMethod} className={inputClass}><option value="reducing">Reducing balance</option><option value="flat">Flat</option></select>
        </Field>
        {num("processingFee", "Processing fee %")}
        {num("lateFee", "Late fee %")}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {num("statementAbove", "Ask for a statement above (₦)", "empty = never")}
        {num("autoApproveUpTo", "Auto-approve up to (₦)", "empty = always review")}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-ink"><input type="checkbox" name="active" defaultChecked={v.active} className="size-4 accent-brand" /> Offered to customers</label>
        <div className="w-44"><SubmitButton arrow={false}>{initial.id ? "Save product" : "Create product"}</SubmitButton></div>
      </div>
    </form>
  );
}
