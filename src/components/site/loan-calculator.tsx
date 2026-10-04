"use client";

import { useEffect, useMemo, useState } from "react";
import { Field, inputClass } from "@/components/form";
import { CheckIcon, CopyIcon, DownloadIcon } from "@/components/icons";
import { FREQUENCIES, calculate, formatMonth, type CalculatorInput, type Frequency, type Method, type RateBasis } from "@/lib/loan-calculator";

const money = new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ngn = (n: number) => `₦${money.format(n)}`;
const DURATIONS = [3, 6, 12, 24, 36, 60];

/** Turns the form values into a shareable query string (and back, in the page). */
function toQuery(v: CalculatorInput) {
  return new URLSearchParams({ amount: String(v.amount), rate: String(v.rate), basis: v.basis, months: String(v.months), repay: v.frequency, method: v.method, start: v.start }).toString();
}

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-flow-col gap-1 rounded-[7px] bg-canvas p-1">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={`rounded-[7px] px-3 py-2 text-sm font-semibold transition ${value === o.value ? "bg-white text-brand shadow-[0_2px_8px_-3px_rgba(6,31,77,.3)]" : "text-body hover:text-ink"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function LoanCalculator({ initial }: { initial: CalculatorInput }) {
  // Text fields keep what's typed (e.g. "300,000"); the numbers are read from them.
  const [amountText, setAmountText] = useState(money.format(initial.amount).replace(/\.00$/, ""));
  const [rateText, setRateText] = useState(String(initial.rate));
  const [monthsText, setMonthsText] = useState(String(initial.months));
  const [basis, setBasis] = useState<RateBasis>(initial.basis);
  const [frequency, setFrequency] = useState<Frequency>(initial.frequency);
  const [method, setMethod] = useState<Method>(initial.method);
  const [start, setStart] = useState(initial.start);
  const [copied, setCopied] = useState(false);

  const amount = Number(amountText.replace(/[₦,\s]/g, ""));
  const rate = Number(rateText.replace(/[%\s]/g, ""));
  const months = Math.round(Number(monthsText));
  const problems = [
    !(amount > 0) && "Enter the amount to borrow.",
    amount > 100_000_000_000 && "That amount is too large.",
    !(rate >= 0) && "Enter the interest rate (0 or more).",
    rate > (basis === "year" ? 1000 : 100) && "That interest rate looks too high.",
    !(months >= 1 && months <= 360) && "Enter a duration between 1 and 360 months.",
    !/^\d{4}-\d{2}$/.test(start) && "Choose the month of the first repayment.",
  ].filter(Boolean) as string[];
  const values: CalculatorInput = { amount, rate, basis, months, frequency, method, start };
  const result = useMemo(() => (problems.length ? null : calculate(values)), [problems.length, amount, rate, basis, months, frequency, method, start]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the address bar in step, so the link can be shared with these figures.
  useEffect(() => {
    if (!problems.length) window.history.replaceState(null, "", `?${toQuery(values)}`);
  }, [problems.length, amount, rate, basis, months, frequency, method, start]); // eslint-disable-line react-hooks/exhaustive-deps

  const freq = FREQUENCIES.find((f) => f.value === frequency)!;
  const uneven = freq.months > 1 && months % freq.months !== 0;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked */ }
  }

  function downloadCsv() {
    if (!result) return;
    const rows = [["S/N", "Payment date", "Opening balance", "Repayment", "Interest", "Principal", "Closing balance"],
      ...result.lines.map((l) => [l.n, formatMonth(l.month), l.opening.toFixed(2), l.payment.toFixed(2), l.interest.toFixed(2), l.principal.toFixed(2), l.closing.toFixed(2)]),
      ["", "Total", "", result.totalPayment.toFixed(2), result.totalInterest.toFixed(2), amount.toFixed(2), ""]];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `loan-schedule-${amount}-${months}m.csv` });
    a.click();
    URL.revokeObjectURL(url);
  }

  const interestShare = result && result.totalPayment ? result.totalInterest / result.totalPayment : 0;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Inputs */}
        <section className="rounded-[7px] border border-line bg-white p-6 sm:p-8 print:hidden" aria-label="Loan details">
          <h2 className="font-display text-xl font-bold text-ink">Loan details</h2>
          <div className="mt-6 space-y-5">
            <Field label="Amount to borrow">
              <div className="flex">
                <span className="flex items-center rounded-l-[7px] border border-r-0 border-line bg-canvas px-4 text-sm font-bold text-body">₦</span>
                <input className={`${inputClass} rounded-l-none`} inputMode="decimal" value={amountText} onChange={(e) => setAmountText(e.target.value)}
                  onBlur={() => amount > 0 && setAmountText(money.format(amount).replace(/\.00$/, ""))} aria-label="Amount to borrow in naira" />
              </div>
            </Field>

            <Field label="Interest rate">
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div className="flex">
                  <input className={`${inputClass} rounded-r-none`} inputMode="decimal" value={rateText} onChange={(e) => setRateText(e.target.value)} aria-label="Interest rate in percent" />
                  <span className="flex items-center rounded-r-[7px] border border-l-0 border-line bg-canvas px-4 text-sm font-bold text-body">%</span>
                </div>
                <Segmented label="Rate is per" value={basis} onChange={setBasis} options={[{ value: "year", label: "a year" }, { value: "month", label: "a month" }]} />
              </div>
            </Field>

            <Field label="Duration" hint={months >= 12 && months % 12 === 0 ? <span className="text-xs font-normal text-muted">{months / 12} year{months === 12 ? "" : "s"}</span> : undefined}>
              <div className="flex">
                <input className={`${inputClass} rounded-r-none`} type="number" min={1} max={360} value={monthsText} onChange={(e) => setMonthsText(e.target.value)} aria-label="Duration in months" />
                <span className="flex items-center rounded-r-[7px] border border-l-0 border-line bg-canvas px-4 text-sm font-bold text-body">months</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DURATIONS.map((d) => (
                  <button key={d} type="button" onClick={() => setMonthsText(String(d))} className={`rounded-[7px] px-3 py-1.5 text-xs font-semibold transition ${months === d ? "bg-brand text-white" : "bg-canvas text-body hover:text-brand"}`}>
                    {d < 12 ? `${d} mo` : `${d / 12} yr`}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Repay">
              <select className={inputClass} value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} aria-label="Repayment frequency">
                {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </Field>

            <div>
              <p className="mb-1.5 text-sm font-semibold text-ink">Interest method</p>
              <Segmented label="Interest method" value={method} onChange={setMethod} options={[{ value: "reducing", label: "Reducing balance" }, { value: "flat", label: "Flat rate" }]} />
              <p className="mt-2 text-xs leading-relaxed text-muted">
                {method === "reducing" ? "Interest is charged on what's still owed, so it falls as you repay. Most banks use this." : "Interest is charged on the full amount for the whole loan, even as you repay. It costs more than the same rate on a reducing balance."}
              </p>
            </div>

            <Field label="First repayment">
              <input className={inputClass} type="month" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Month of the first repayment" />
            </Field>
          </div>
        </section>

        {/* Results */}
        <section className="diamond-pattern relative overflow-hidden rounded-[7px] bg-brand p-6 text-white sm:p-8 lg:sticky lg:top-24 lg:self-start print:bg-white print:text-ink" aria-live="polite" aria-label="Results">
          {result ? (
            <div className="relative">
              <p className="text-sm font-semibold text-white/75 print:text-muted">Your {freq.label.toLowerCase() === "every 6 months" ? "6-monthly" : freq.label.toLowerCase()} repayment</p>
              <p className="mt-1 font-display text-4xl font-extrabold tabular-nums sm:text-5xl">{ngn(result.payment)}</p>
              <p className="mt-2 text-sm text-white/75 print:text-muted">{result.instalments} repayment{result.instalments === 1 ? "" : "s"}, {formatMonth(result.firstMonth)}{result.instalments > 1 ? ` to ${formatMonth(result.lastMonth)}` : ""}</p>

              <div className="mt-6" aria-hidden="true">
                <div className="flex h-3 overflow-hidden rounded-[7px] bg-white/15">
                  <div className="h-full bg-white" style={{ width: `${(1 - interestShare) * 100}%` }} />
                  <div className="h-full bg-gold" style={{ width: `${interestShare * 100}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-xs text-white/75 print:text-muted">
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-white ring-1 ring-white/40" />Principal {Math.round((1 - interestShare) * 100)}%</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-gold" />Interest {Math.round(interestShare * 100)}%</span>
                </div>
              </div>

              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  ["Total repayment", ngn(result.totalPayment)],
                  ["Total interest", ngn(result.totalInterest)],
                  ["Amount borrowed", ngn(amount)],
                  ["Interest rate", `${+result.annualRate.toFixed(4)}% a year${basis === "month" ? ` (${rate}% a month)` : ""}`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-[7px] bg-white/10 p-4 ring-1 ring-white/15 print:bg-canvas print:ring-line">
                    <dt className="text-xs font-semibold text-white/70 print:text-muted">{k}</dt>
                    <dd className="mt-1 font-display text-lg font-bold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>

              {method === "flat" && result.annualRate > 0 && (
                <p className="mt-4 rounded-[7px] bg-gold px-4 py-3 text-sm font-semibold text-ink">
                  A flat {+result.annualRate.toFixed(2)}% a year costs the same as {result.apr.toFixed(2)}% a year on a reducing balance (the true annual rate, or APR).
                </p>
              )}
              {uneven && <p className="mt-4 text-xs text-white/75 print:text-muted">{months} months doesn&apos;t divide evenly into {freq.label.toLowerCase()} repayments, so it&apos;s rounded up to {result.instalments}.</p>}
            </div>
          ) : (
            <div className="relative">
              <p className="font-display text-xl font-bold">Check the loan details</p>
              <ul className="mt-3 space-y-1 text-sm text-white/80">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          )}
        </section>
      </div>

      {result && (
        <section className="rounded-[7px] border border-line bg-white" aria-label="Repayment schedule">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Repayment schedule</h2>
              <p className="text-sm text-muted">{FREQUENCIES.find((f) => f.value === frequency)!.label} repayments · {method === "reducing" ? "reducing balance" : "flat rate"}</p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <button type="button" onClick={copyLink} className="inline-flex items-center gap-2 rounded-[7px] border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-brand-200">
                {copied ? <CheckIcon className="size-4 text-success" /> : <CopyIcon className="size-4" />}{copied ? "Link copied" : "Copy link"}
              </button>
              <button type="button" onClick={downloadCsv} className="inline-flex items-center gap-2 rounded-[7px] border border-line px-4 py-2 text-sm font-semibold text-ink hover:border-brand-200"><DownloadIcon className="size-4" />Download CSV</button>
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-[7px] bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-600">Print</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="bg-canvas text-left text-xs font-bold uppercase tracking-wide text-muted">
                  {["S/N", "Payment date", "Opening balance", "Repayment", "Interest", "Principal", "Closing balance"].map((h, i) => <th key={h} className={`px-4 py-3 ${i > 1 ? "text-right" : ""}`}>{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line tabular-nums">
                {result.lines.map((l) => (
                  <tr key={l.n} className="hover:bg-canvas/60">
                    <td className="px-4 py-2.5 text-muted">{l.n}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-ink">{formatMonth(l.month)}</td>
                    <td className="px-4 py-2.5 text-right">{money.format(l.opening)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-ink">{money.format(l.payment)}</td>
                    <td className="px-4 py-2.5 text-right">{money.format(l.interest)}</td>
                    <td className="px-4 py-2.5 text-right">{money.format(l.principal)}</td>
                    <td className="px-4 py-2.5 text-right">{money.format(l.closing)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line bg-canvas font-bold text-ink tabular-nums">
                  <td className="px-4 py-3" colSpan={3}>Total</td>
                  <td className="px-4 py-3 text-right">{money.format(result.totalPayment)}</td>
                  <td className="px-4 py-3 text-right">{money.format(result.totalInterest)}</td>
                  <td className="px-4 py-3 text-right">{money.format(amount)}</td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      <p className="text-xs leading-relaxed text-muted">
        These figures are estimates for planning only and aren&apos;t a loan offer. Amounts are rounded to the kobo each period, so the last repayment may differ slightly.
        A real loan&apos;s cost also depends on its fees and terms.
      </p>
    </div>
  );
}
