"use client";

import Link from "next/link";
import { useState } from "react";
import { INVEST_RATES, LOAN_MONTHLY_RATE, SAVINGS_RATE, investmentProjection, loanRepayment, savingsProjection } from "@/lib/calculators";
import { formatNairaWhole } from "@/lib/format";
import { ArrowRightIcon, LandmarkIcon, PiggyIcon, TrendUpIcon } from "@/components/icons";

type Mode = "save" | "invest" | "borrow";

const MODES: { id: Mode; label: string; icon: React.ReactNode }[] = [
  { id: "save", label: "Save", icon: <PiggyIcon className="size-4" /> },
  { id: "invest", label: "Invest", icon: <TrendUpIcon className="size-4" /> },
  { id: "borrow", label: "Borrow", icon: <LandmarkIcon className="size-4" /> },
];

function Slider({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string }) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-body">{label}</span>
        <span className="font-display text-lg font-bold text-ink tabular-nums">{format(value)}</span>
      </span>
      <input type="range" className="range mt-3" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ ["--fill" as string]: `${fill}%` }} />
      <span className="mt-1.5 flex justify-between text-xs text-muted"><span>{format(min)}</span><span>{format(max)}</span></span>
    </label>
  );
}

function Chips({ options, value, onChange, suffix }: { options: number[]; value: number; onChange: (v: number) => void; suffix: string }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)} className={`rounded-[7px] border py-2.5 text-sm font-semibold transition-all ${value === o ? "border-brand bg-brand text-white shadow-[0_8px_20px_-10px_rgba(1,80,200,.8)]" : "border-line bg-white text-body hover:border-brand-300"}`}>
          {o} {suffix}
        </button>
      ))}
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className={`text-sm ${strong ? "font-semibold text-white" : "text-white/70"}`}>{label}</span>
      <span className={`tabular-nums ${strong ? "font-display text-base font-bold text-gold" : "text-sm font-semibold text-white"}`}>{value}</span>
    </div>
  );
}

export function MoneyCalculator({ initialMode = "invest", ctaHref = "/register" }: { initialMode?: Mode; ctaHref?: string }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [monthly, setMonthly] = useState(50_000);
  const [saveMonths, setSaveMonths] = useState(12);
  const [principal, setPrincipal] = useState(1_000_000);
  const [investMonths, setInvestMonths] = useState(12);
  const [loan, setLoan] = useState(500_000);
  const [loanMonths, setLoanMonths] = useState(6);

  const save = savingsProjection(monthly, saveMonths);
  const invest = investmentProjection(principal, investMonths);
  const borrow = loanRepayment(loan, loanMonths);

  const headline = mode === "save" ? save.total : mode === "invest" ? invest.payout : borrow.monthly;
  const headlineLabel = mode === "save" ? `You'll have after ${saveMonths} months` : mode === "invest" ? `Payout at maturity` : "Monthly repayment";

  return (
    <div className="overflow-hidden rounded-[7px] bg-white shadow-[0_40px_80px_-40px_rgba(6,31,77,.45)] ring-1 ring-line">
      <div className="grid lg:grid-cols-[1.15fr_1fr]">
        <div className="p-6 sm:p-8">
          <div role="tablist" aria-label="Calculator" className="inline-flex rounded-full bg-canvas p-1">
            {MODES.map((m) => (
              <button key={m.id} role="tab" type="button" aria-selected={mode === m.id} onClick={() => setMode(m.id)} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all sm:px-5 ${mode === m.id ? "bg-white text-brand shadow-sm" : "text-muted hover:text-ink"}`}>
                {m.icon}{m.label}
              </button>
            ))}
          </div>

          <div key={mode} className="page-in mt-7 space-y-7">
            {mode === "save" && (
              <>
                <Slider label="I can save every month" value={monthly} min={5_000} max={1_000_000} step={5_000} onChange={setMonthly} format={formatNairaWhole} />
                <Slider label="For" value={saveMonths} min={3} max={36} step={1} onChange={setSaveMonths} format={(v) => `${v} months`} />
              </>
            )}
            {mode === "invest" && (
              <>
                <Slider label="I want to invest" value={principal} min={100_000} max={20_000_000} step={50_000} onChange={setPrincipal} format={formatNairaWhole} />
                <div>
                  <p className="mb-3 text-sm font-semibold text-body">Tenor</p>
                  <Chips options={Object.keys(INVEST_RATES).map(Number)} value={investMonths} onChange={setInvestMonths} suffix="mo" />
                </div>
              </>
            )}
            {mode === "borrow" && (
              <>
                <Slider label="I need" value={loan} min={50_000} max={5_000_000} step={10_000} onChange={setLoan} format={formatNairaWhole} />
                <div>
                  <p className="mb-3 text-sm font-semibold text-body">Repay over</p>
                  <Chips options={[3, 6, 9, 12]} value={loanMonths} onChange={setLoanMonths} suffix="mo" />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="gold-corner diamond-pattern relative flex flex-col bg-brand p-6 text-white sm:p-8">
          <p className="text-sm font-medium text-white/75">{headlineLabel}</p>
          <p key={`${mode}-${Math.round(headline)}`} className="page-in mt-1 font-display text-4xl font-extrabold tabular-nums sm:text-[2.6rem]">{formatNairaWhole(headline)}</p>

          <div className="mt-6 divide-y divide-white/15">
            {mode === "save" && (
              <>
                <Row label="Total saved" value={formatNairaWhole(save.contributed)} />
                <Row label={`Interest at ${(SAVINGS_RATE * 100).toFixed(0)}% p.a.`} value={`+${formatNairaWhole(save.interest)}`} strong />
              </>
            )}
            {mode === "invest" && (
              <>
                <Row label="Rate" value={`${(invest.rate * 100).toFixed(1)}% p.a.`} />
                <Row label="Gross returns" value={formatNairaWhole(invest.gross)} />
                <Row label="Returns after 10% WHT" value={`+${formatNairaWhole(invest.net)}`} strong />
              </>
            )}
            {mode === "borrow" && (
              <>
                <Row label="Interest rate" value={`${(LOAN_MONTHLY_RATE * 100).toFixed(1)}% monthly`} />
                <Row label="Total interest" value={formatNairaWhole(borrow.interest)} />
                <Row label="Total repayment" value={formatNairaWhole(borrow.total)} strong />
              </>
            )}
          </div>

          <Link href={ctaHref} className="relative z-10 mt-auto flex items-center justify-center gap-2 rounded-full bg-white py-3.5 text-sm font-bold text-brand transition-transform hover:-translate-y-0.5 max-lg:mt-8 lg:mt-8">
            {mode === "borrow" ? "Check my eligibility" : mode === "invest" ? "Start investing" : "Start saving"} <ArrowRightIcon className="size-4" />
          </Link>
          <p className="relative z-10 mt-3 text-center text-[11px] text-white/60">Indicative figures. Final rates depend on your profile and market conditions.</p>
        </div>
      </div>
    </div>
  );
}
