import type { Metadata } from "next";
import { LoanCalculator } from "@/components/site/loan-calculator";
import { FREQUENCIES, addMonths, type CalculatorInput, type Frequency } from "@/lib/loan-calculator";
import { todayIso } from "@/lib/loans/math";

// A hidden tool: reachable by link only. Not in the site's menus, and search engines are asked not to list it.
export const metadata: Metadata = {
  title: "Loan calculator",
  description: "Work out repayments, total interest and a full repayment schedule for a loan.",
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

type Params = Partial<Record<"amount" | "rate" | "basis" | "months" | "repay" | "method" | "start", string>>;

/** Reads a shared link's figures, falling back to sensible defaults. */
function initialValues(p: Params): CalculatorInput {
  const num = (v: string | undefined, fallback: number) => (v !== undefined && Number.isFinite(Number(v)) ? Number(v) : fallback);
  const nextMonth = addMonths(todayIso().slice(0, 7), 1);
  return {
    amount: num(p.amount, 300_000),
    rate: num(p.rate, 9),
    basis: p.basis === "month" ? "month" : "year",
    months: num(p.months, 12),
    frequency: FREQUENCIES.some((f) => f.value === p.repay) ? (p.repay as Frequency) : "monthly",
    method: p.method === "flat" ? "flat" : "reducing",
    start: p.start && /^\d{4}-\d{2}$/.test(p.start) ? p.start : nextMonth,
  };
}

export default async function LoanCalculatorPage({ searchParams }: { searchParams: Promise<Params> }) {
  const initial = initialValues(await searchParams);
  return (
    <>
      <section className="diamond-pattern relative overflow-hidden bg-brand pb-14 pt-32 text-white sm:pt-36 print:bg-white print:pb-4 print:pt-4 print:text-ink">
        <div className="absolute -bottom-10 -right-20 h-20 w-[420px] -rotate-[20deg] bg-gold max-sm:hidden print:hidden" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
          <p className="flex items-center gap-3 text-sm font-bold text-white/80 print:text-muted"><span className="h-[3px] w-8 bg-gold" />Tools</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">Loan calculator</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/80 print:text-body">See what a loan really costs: the repayment, the total interest and every payment, month by month.</p>
        </div>
      </section>
      <div className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6 md:py-14 lg:px-8 print:py-4">
        <LoanCalculator key={JSON.stringify(initial)} initial={initial} />
      </div>
    </>
  );
}
