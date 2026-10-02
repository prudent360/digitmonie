"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import type { FormState } from "@/app/actions/auth";
import { FormAlert, SubmitButton } from "@/components/auth/form-bits";
import { Field, inputClass } from "@/components/form";
import { CheckIcon, LockIcon } from "@/components/icons";
import { bpsToPercent, quoteLoan, toKobo, toNaira, type InterestMethod } from "@/lib/loans/math";

export type ProductOption = {
  id: number; name: string; description: string; minAmount: number; maxAmount: number; tenors: number[];
  monthlyRateBps: number; interestMethod: InterestMethod; processingFeeBps: number; lateFeeBps: number; minKycTier: number; statementAbove: number | null;
};

const ngn = (kobo: number) => `₦${toNaira(kobo).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
const PURPOSES = ["Rent", "School fees", "Medical bills", "Business stock", "Personal emergency", "Home appliances", "Travel"];

function KeyFacts({ product, amount, tenor }: { product: ProductOption; amount: number; tenor: number }) {
  const q = useMemo(() => quoteLoan({ principal: amount, tenor, monthlyRateBps: product.monthlyRateBps, method: product.interestMethod, processingFeeBps: product.processingFeeBps }), [product, amount, tenor]);
  const [open, setOpen] = useState(false);
  const row = (label: string, value: string, strong = false) => (
    <div className="flex items-center justify-between py-2"><span className={strong ? "font-semibold text-white" : "text-white/70"}>{label}</span><span className={`tabular-nums ${strong ? "font-display text-base font-bold text-gold" : "font-semibold text-white"}`}>{value}</span></div>
  );
  return (
    <div className="gold-corner diamond-pattern relative rounded-[5px] bg-brand p-5 text-sm text-white">
      <p className="text-xs font-bold uppercase tracking-wider text-white/70">Key facts</p>
      <p className="mt-2 text-white/70">Monthly repayment</p>
      <p className="font-display text-3xl font-extrabold tabular-nums">{ngn(q.instalment)}<span className="text-base font-semibold text-white/70"> × {tenor}</span></p>
      <div className="relative z-10 mt-4 divide-y divide-white/15">
        {row("You receive", ngn(q.disbursed))}
        {row(`Processing fee (${bpsToPercent(product.processingFeeBps)})`, ngn(q.processingFee))}
        {row(`Interest (${bpsToPercent(product.monthlyRateBps)} a month, ${product.interestMethod === "flat" ? "flat" : "reducing balance"})`, ngn(q.totalInterest))}
        {row("Total you repay", ngn(q.totalRepayable), true)}
        {row("Annual percentage rate (APR)", bpsToPercent(q.aprBps))}
        {row("First repayment", q.schedule[0]?.dueDate ?? "")}
        {row("If a repayment is late", `${bpsToPercent(product.lateFeeBps)} one-off fee`)}
      </div>
      <button type="button" onClick={() => setOpen((v) => !v)} className="relative z-10 mt-3 text-xs font-bold text-gold">{open ? "Hide" : "Show"} repayment schedule</button>
      {open && (
        <table className="relative z-10 mt-2 w-full text-xs">
          <tbody>
            {q.schedule.map((l) => (
              <tr key={l.n} className="border-t border-white/10"><td className="py-1.5 text-white/70">{l.n}. {l.dueDate}</td><td className="py-1.5 text-right font-semibold tabular-nums">{ngn(l.total)}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="relative z-10 mt-4 text-[11px] leading-relaxed text-white/60">No hidden charges. You can repay early at any time and only pay interest for the months you borrowed.</p>
    </div>
  );
}

type Lookup = (bankCode: string, account: string) => Promise<{ ok: true; accountName: string } | { ok: false; error: string }>;

/** Bank + account number, with a live name check against the bank as soon as 10 digits are entered. */
function PayoutAccount({ banks, lookup, initialBank, initialAccount }: { banks: { code: string; name: string }[]; lookup: Lookup; initialBank?: string; initialAccount?: string }) {
  const [bank, setBank] = useState(initialBank ?? "");
  const [account, setAccount] = useState(initialAccount ?? "");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [checking, start] = useTransition();
  useEffect(() => {
    if (!bank || !/^\d{10}$/.test(account)) return;
    let cancelled = false;
    start(async () => {
      const r = await lookup(bank, account);
      if (!cancelled) setResult(r.ok ? { ok: true, text: r.accountName } : { ok: false, text: r.error });
    });
    return () => { cancelled = true; };
  }, [bank, account, lookup]);
  const ready = bank && /^\d{10}$/.test(account);
  return (
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <Field label="Bank">
        <select className={inputClass} name="payoutBankCode" value={bank} onChange={(e) => { setBank(e.target.value); setResult(null); }} required>
          <option value="" disabled>Choose bank</option>
          {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
        </select>
      </Field>
      <Field label="Account number"><input className={`${inputClass} font-mono tracking-wider`} name="payoutAccount" inputMode="numeric" maxLength={10} pattern="\d{10}" value={account} onChange={(e) => { setAccount(e.target.value.replace(/\D/g, "")); setResult(null); }} required /></Field>
      <div className="sm:col-span-2" aria-live="polite">
        {checking && <p className="rounded-[5px] bg-canvas px-4 py-3 text-sm text-muted">Checking with the bank…</p>}
        {!checking && ready && result && (result.ok
          ? <p className="flex items-center gap-2 rounded-[5px] bg-success-soft px-4 py-3 text-sm font-bold text-success"><CheckIcon className="size-4" />{result.text}</p>
          : <p className="rounded-[5px] bg-danger-soft px-4 py-3 text-sm font-medium text-danger">{result.text}</p>)}
      </div>
    </div>
  );
}

export function LoanApplyForm({ action, lookup, products, limit, kycTier, banks, employmentTypes, defaults }: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  lookup: Lookup;
  products: ProductOption[]; limit: number; kycTier: number; banks: { code: string; name: string }[]; employmentTypes: string[];
  defaults: { monthlyIncome: string; employmentType: string; employer: string };
}) {
  const [state, formAction] = useActionState(action, undefined);
  const f = state?.fields ?? {};
  const usable = products.filter((p) => p.minKycTier <= kycTier && p.minAmount <= limit);
  const [productId, setProductId] = useState(Number(f.productId) || usable[0]?.id || 0);
  const product = products.find((p) => p.id === productId) ?? usable[0];
  const maxAllowed = product ? Math.min(product.maxAmount, limit) : 0;
  const [amount, setAmount] = useState(() => (f.amount ? toKobo(Number(f.amount)) : Math.min(maxAllowed, Math.max(product?.minAmount ?? 0, Math.round(maxAllowed / 2 / 100_000) * 100_000))));
  const [tenor, setTenor] = useState(Number(f.tenor) || product?.tenors[Math.min(1, (product?.tenors.length ?? 1) - 1)] || 1);

  if (!product) return <p className="rounded-[5px] bg-canvas p-6 text-sm text-body">No loan is available for your current limit and KYC tier yet.</p>;
  const clamped = Math.min(maxAllowed, Math.max(product.minAmount, amount));
  const step = maxAllowed - product.minAmount >= 100_000_000 ? 5_000_000 : 1_000_000;
  const fill = maxAllowed > product.minAmount ? ((clamped - product.minAmount) / (maxAllowed - product.minAmount)) * 100 : 100;
  const needsStatement = product.statementAbove != null && clamped > product.statementAbove;

  function choose(p: ProductOption) {
    setProductId(p.id);
    const max = Math.min(p.maxAmount, limit);
    setAmount(Math.min(max, Math.max(p.minAmount, amount)));
    setTenor(p.tenors.includes(tenor) ? tenor : p.tenors[0]);
  }

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
      <input type="hidden" name="productId" value={product.id} />
      <input type="hidden" name="amount" value={toNaira(clamped)} />
      <input type="hidden" name="tenor" value={tenor} />

      <div className="space-y-6">
        <FormAlert state={state} />
        <section>
          <h2 className="text-sm font-bold text-ink">1. Loan type</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {products.map((p) => {
              const locked = p.minKycTier > kycTier || p.minAmount > limit;
              const selected = p.id === product.id;
              return (
                <button key={p.id} type="button" disabled={locked} onClick={() => choose(p)} className={`rounded-[5px] border p-4 text-left transition ${selected ? "border-brand bg-brand-50 ring-2 ring-brand-100" : "border-line bg-white hover:border-brand-200"} disabled:cursor-not-allowed disabled:opacity-50`}>
                  <span className="flex items-center justify-between"><span className="font-bold text-ink">{p.name}</span>{selected && <CheckIcon className="size-4 text-brand" />}{locked && <LockIcon className="size-4 text-muted" />}</span>
                  <span className="mt-1 block text-xs text-muted">{bpsToPercent(p.monthlyRateBps)} a month · {p.tenors[0]}–{p.tenors.at(-1)} mo</span>
                  {locked && <span className="mt-1 block text-xs font-semibold text-warning">{p.minKycTier > kycTier ? `Needs KYC Tier ${p.minKycTier}` : "Above your current limit"}</span>}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[5px] border border-line bg-white p-5">
          <h2 className="text-sm font-bold text-ink">2. How much, and for how long?</h2>
          <div className="mt-4 flex items-end justify-between gap-4">
            <label className="flex-1">
              <span className="text-xs text-muted">Amount (your limit is {ngn(limit)})</span>
              <input value={toNaira(clamped).toLocaleString("en-NG")} onChange={(e) => setAmount(toKobo(Number(e.target.value.replace(/[^\d]/g, "")) || 0))} inputMode="numeric" className="mt-1 w-full border-0 bg-transparent p-0 font-display text-3xl font-extrabold text-ink outline-none" aria-label="Loan amount in naira" />
            </label>
          </div>
          <input type="range" className="range mt-3" min={product.minAmount} max={maxAllowed} step={step} value={clamped} onChange={(e) => setAmount(Number(e.target.value))} style={{ ["--fill" as string]: `${fill}%` }} aria-label="Loan amount" />
          <p className="mt-1 flex justify-between text-xs text-muted"><span>{ngn(product.minAmount)}</span><span>{ngn(maxAllowed)}</span></p>
          <p className="mb-2 mt-5 text-xs text-muted">Repay over</p>
          <div className="flex flex-wrap gap-2">
            {product.tenors.map((t) => (
              <button key={t} type="button" onClick={() => setTenor(t)} className={`rounded-[5px] border px-4 py-2 text-sm font-bold ${t === tenor ? "border-brand bg-brand text-white" : "border-line bg-white text-body hover:border-brand-200"}`}>{t} month{t > 1 ? "s" : ""}</button>
            ))}
          </div>
        </section>

        <section className="rounded-[5px] border border-line bg-white p-5">
          <h2 className="text-sm font-bold text-ink">3. About you</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="What is the loan for?">
                <input className={inputClass} name="purpose" list="purposes" defaultValue={f.purpose} required maxLength={200} />
                <datalist id="purposes">{PURPOSES.map((p) => <option key={p} value={p} />)}</datalist>
              </Field>
            </div>
            <Field label="Monthly income (₦)"><input className={inputClass} name="monthlyIncome" inputMode="numeric" defaultValue={f.monthlyIncome ?? defaults.monthlyIncome} placeholder="250,000" required /></Field>
            <Field label="Employment">
              <select className={inputClass} name="employmentType" defaultValue={f.employmentType ?? defaults.employmentType} required>
                <option value="" disabled>Choose</option>
                {employmentTypes.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2"><Field label="Employer or business name (optional)"><input className={inputClass} name="employer" defaultValue={f.employer ?? defaults.employer} /></Field></div>
          </div>
        </section>

        <section className="rounded-[5px] border border-line bg-white p-5">
          <h2 className="text-sm font-bold text-ink">4. Where should we send the money?</h2>
          <p className="mt-1 text-xs text-muted">The account must be in your own name. We check it with your bank.</p>
          <PayoutAccount banks={banks} lookup={lookup} initialBank={f.payoutBankCode} initialAccount={f.payoutAccount} />
        </section>

        {needsStatement && (
          <section className="rounded-[5px] border border-gold/50 bg-gold-50 p-5">
            <h2 className="text-sm font-bold text-ink">5. Bank statement</h2>
            <p className="mt-1 text-xs text-body">For loans above {ngn(product.statementAbove!)} we need your last 6 months&apos; statement from your main bank (PDF, JPG or PNG, max 3 MB).</p>
            <input type="file" name="statement" accept="application/pdf,image/jpeg,image/png" required className="mt-3 block w-full rounded-[5px] border border-dashed border-line bg-white p-3 text-sm file:mr-4 file:rounded-[5px] file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-bold file:text-white" />
          </section>
        )}
      </div>

      <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <KeyFacts product={product} amount={clamped} tenor={tenor} />
        <div className="space-y-4 rounded-[5px] border border-line bg-white p-5">
          <label className="flex items-start gap-3 text-sm text-body">
            <input type="checkbox" name="acceptTerms" required className="mt-0.5 size-4 shrink-0 accent-brand" />
            <span>I&apos;ve read the key facts above and agree to the <a href="/loan-terms" target="_blank" rel="noopener" className="font-semibold text-brand">Loan Terms</a>. I understand DigitMonie will check my credit record and report this loan to licensed credit bureaus.</span>
          </label>
          <Field label="Transaction PIN"><input className={`${inputClass} font-display text-lg tracking-[.5em]`} type="password" name="pin" inputMode="numeric" maxLength={4} pattern="\d{4}" required /></Field>
          <SubmitButton>Submit application</SubmitButton>
        </div>
      </div>
    </form>
  );
}
