"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui";
import { CheckIcon, ClockIcon, IdCardIcon, LockIcon, PhoneIcon, PiggyIcon, SendIcon, TrendUpIcon } from "@/components/icons";
import { AppTabBar, PhoneFrame, ScreenHeader, type AppTab } from "./phone-frame";

const tick = <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-white"><CheckIcon className="size-3" /></span>;
const tile = "rounded-[7px] bg-white p-3 shadow-[0_1px_2px_rgba(6,31,77,.06)]";
const primary = "block rounded-[7px] bg-brand py-3 text-center text-[12px] font-bold text-white";

const OpenAccountScreen = (
  <>
    <ScreenHeader title="Verify your identity" />
    <div className="space-y-3 px-4">
      <div className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-1 flex-1 rounded-full bg-brand" />)}</div>
      {[
        { label: "Phone and email", detail: "Confirmed with a code", icon: <PhoneIcon className="size-4" /> },
        { label: "BVN", detail: "Matched · Adaeze Okafor", icon: <IdCardIcon className="size-4" /> },
        { label: "NIN and selfie", detail: "Face matched", icon: <IdCardIcon className="size-4" /> },
      ].map((row) => (
        <div key={row.label} className={`${tile} flex items-center gap-3`}>
          <span className="flex size-9 items-center justify-center rounded-[7px] bg-brand-50 text-brand">{row.icon}</span>
          <span className="flex-1"><span className="block text-[12px] font-bold text-ink">{row.label}</span><span className="block text-[10.5px] text-muted">{row.detail}</span></span>
          {tick}
        </div>
      ))}
      <div className="gold-corner diamond-pattern relative rounded-[7px] bg-brand p-4 text-white">
        <p className="text-[10.5px] text-white/70">You&apos;re verified</p>
        <p className="mt-1 font-display text-[18px] font-extrabold">Tier 2 unlocked</p>
        <p className="text-[10.5px] text-white/70">See how much you can borrow</p>
      </div>
      <span className={primary}>Go to my dashboard</span>
    </div>
  </>
);

const BorrowScreen = (
  <>
    <ScreenHeader title="Get a loan" />
    <div className="space-y-3 px-4">
      <div className={tile}>
        <p className="text-[10.5px] text-muted">How much do you need?</p>
        <p className="font-display text-[24px] font-extrabold text-ink">₦250,000</p>
        <div className="mt-2 h-1.5 rounded-full bg-brand-50"><div className="relative h-full w-1/2 rounded-full bg-brand"><span className="absolute -right-2 -top-1.5 size-4 rounded-full border-4 border-brand bg-white" /></div></div>
        <p className="mt-2 flex justify-between text-[10px] text-muted"><span>₦10k</span><span>Your limit ₦500k</span></p>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {[1, 2, 3].map((m) => <span key={m} className={`rounded-[7px] py-2 text-center text-[11px] font-bold ${m === 3 ? "bg-brand text-white" : "bg-white text-body"}`}>{m} mo</span>)}
      </div>
      <div className={`${tile} space-y-2 text-[11px]`}>
        {[["Monthly repayment", "₦90,944"], ["Total to repay", "₦272,832"], ["First repayment", "28 Oct"]].map(([k, v]) => (
          <p key={k} className="flex justify-between"><span className="text-muted">{k}</span><span className="font-bold text-ink">{v}</span></p>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-[7px] bg-success-soft p-3 text-[11px] font-semibold text-success">{tick} Full cost shown. No collateral.</div>
      <span className={primary}>Apply for ₦250,000</span>
    </div>
  </>
);

const PaidScreen = (
  <>
    <ScreenHeader title="Loan sent" />
    <div className="space-y-3 px-4">
      <div className={`${tile} flex flex-col items-center py-6`}>
        <span className="flex size-14 items-center justify-center rounded-full bg-success text-white"><CheckIcon className="size-7" /></span>
        <p className="mt-3 font-display text-[22px] font-extrabold text-ink">₦250,000</p>
        <p className="text-[11px] text-muted">sent to your bank account</p>
      </div>
      <div className={`${tile} flex items-center gap-3`}>
        <Avatar name="Adaeze Okafor" className="size-9 text-[11px]" />
        <span><span className="block text-[12px] font-bold text-ink">Adaeze Okafor</span><span className="block text-[10.5px] text-muted">GTBank · 0123456789</span></span>
      </div>
      <div className={`${tile} space-y-2 text-[11px]`}>
        {[["Name check", "Matches your BVN"], ["Reference", "DM-91822114"], ["First repayment", "28 Oct"]].map(([k, v]) => (
          <p key={k} className="flex justify-between"><span className="text-muted">{k}</span><span className="font-bold text-ink">{v}</span></p>
        ))}
      </div>
      <span className={primary}>View repayment plan</span>
    </div>
  </>
);

const RepayScreen = (
  <>
    <ScreenHeader title="Repayments" />
    <div className="space-y-3 px-4">
      <div className="rounded-[7px] bg-brand-950 p-4 text-white">
        <p className="text-[10.5px] text-white/60">Left to repay</p>
        <p className="font-display text-[22px] font-extrabold">₦181,888</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full w-1/3 bg-gold" /></div>
        <p className="mt-1.5 text-[10px] text-white/60">1 of 3 payments made</p>
      </div>
      {[
        { d: "28 Sep", a: "₦90,944", s: "Paid" },
        { d: "28 Oct", a: "₦90,944", s: "Next" },
        { d: "28 Nov", a: "₦90,944", s: "" },
      ].map((r) => (
        <div key={r.d} className={`${tile} flex items-center justify-between py-2.5 text-[11px]`}>
          <span className="font-semibold text-ink">{r.d}</span>
          <span className="flex items-center gap-2"><span className="font-bold text-ink">{r.a}</span>{r.s && <span className={`rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold ${r.s === "Paid" ? "bg-success-soft text-success" : "bg-brand-50 text-brand"}`}>{r.s}</span>}</span>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-2">
        <span className={primary}>Pay ₦90,944</span>
        <span className="block rounded-[7px] bg-white py-3 text-center text-[12px] font-bold text-brand ring-1 ring-brand-100">Pay off early</span>
      </div>
    </div>
  </>
);

const SoonScreen = (
  <>
    <ScreenHeader title="Grow" action={<span className="rounded-[7px] bg-gold px-2 py-1 text-[10px] font-bold text-ink">Coming soon</span>} />
    <div className="space-y-3 px-4">
      {[
        { n: "Savings goals", d: "Rent, school fees, emergencies", icon: <PiggyIcon className="size-4" /> },
        { n: "Investments", d: "Treasury bills and money market funds", icon: <TrendUpIcon className="size-4" /> },
        { n: "Transfers and bills", d: "Send money, buy airtime and data", icon: <SendIcon className="size-4" /> },
      ].map((p) => (
        <div key={p.n} className={`${tile} flex items-center gap-3`}>
          <span className="flex size-9 items-center justify-center rounded-[7px] bg-brand-50 text-brand">{p.icon}</span>
          <span className="flex-1"><span className="block text-[11.5px] font-bold text-ink">{p.n}</span><span className="block text-[10px] text-muted">{p.d}</span></span>
          <LockIcon className="size-4 text-muted" />
        </div>
      ))}
      <div className={`${tile} flex flex-col items-center py-5 text-center`}>
        <span className="relative flex size-24 items-center justify-center">
          <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90"><circle cx="18" cy="18" r="15" fill="none" stroke="#eef4ff" strokeWidth="3" /><circle cx="18" cy="18" r="15" fill="none" stroke="#f0ca56" strokeWidth="3" strokeLinecap="round" strokeDasharray="94.2" strokeDashoffset="34" /></svg>
          <ClockIcon className="size-6 text-brand" />
        </span>
        <p className="mt-3 text-[12px] font-bold text-ink">We&apos;re building these now</p>
        <p className="text-[10.5px] text-muted">They&apos;ll appear here when they launch</p>
      </div>
    </div>
  </>
);

type Step = { tab: AppTab; title: string; text: string; points: string[]; screen: React.ReactNode };

function buildSteps(borrowPoints: string[]): Step[] {
  return [
    { tab: "Home", title: "Open an account in minutes", text: "Sign up with your phone number and email, then verify with your BVN. A quick selfie with your NIN unlocks bigger loans.", points: ["No branch visit", "No paperwork", "Free to open"], screen: OpenAccountScreen },
    { tab: "Loans", title: "Choose your amount and time", text: "See how much you can borrow, pick an amount and how long to repay. You see the full cost before you accept.", points: borrowPoints, screen: BorrowScreen },
    { tab: "Loans", title: "Get paid into your bank account", text: "Once approved, the money goes straight to a bank account in your name. We check the name matches your BVN, so it can't go to the wrong person.", points: ["Account in your name", "Name checked with your BVN", "Receipt in the app"], screen: PaidScreen },
    { tab: "Loans", title: "Repay your way", text: "Pay each instalment by card or bank transfer. We remind you before every due date, and you can pay off early to save on interest.", points: ["Card or bank transfer", "Reminders before due dates", "Repay early, pay less"], screen: RepayScreen },
    { tab: "Save", title: "Savings and investments, coming soon", text: "We're building savings goals, investments, transfers and bill payments. They'll appear in your account when they launch.", points: ["Savings goals", "Investments", "Transfers and bills"], screen: SoonScreen },
  ];
}

/** Text scrolls on the left while one phone stays put on the right and switches screens. */
export function ScrollPhone({ borrowPoints }: { borrowPoints: string[] }) {
  const STEPS = buildSteps(borrowPoints);
  const [active, setActive] = useState(0);
  const steps = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    // The step crossing the middle of the viewport is the active one.
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(Number((e.target as HTMLElement).dataset.index))),
      { rootMargin: "-50% 0px -50% 0px" },
    );
    steps.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="lg:grid lg:grid-cols-[1fr_440px] lg:gap-20">
      <div>
        {STEPS.map((step, i) => (
          <article key={step.title} data-index={i} ref={(el) => { steps.current[i] = el; }} className="flex flex-col justify-center border-t border-line py-12 first:border-t-0 lg:min-h-[80vh] lg:border-t-0 lg:py-0">
            <div className={`transition-opacity duration-500 ${active === i ? "" : "lg:opacity-25"}`}>
              <p className="font-display text-sm font-bold text-brand">
                <span className="text-ink">{String(i + 1).padStart(2, "0")}</span> / {String(STEPS.length).padStart(2, "0")}
              </p>
              <h3 className="mt-3 max-w-lg font-display text-3xl font-extrabold leading-tight text-ink sm:text-4xl">{step.title}</h3>
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-body">{step.text}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {step.points.map((p) => (
                  <li key={p} className="flex items-center gap-2 rounded-[7px] bg-white px-3 py-2 text-sm font-semibold text-ink ring-1 ring-line">
                    <span className="h-3 w-1 bg-gold" />{p}
                  </li>
                ))}
              </ul>
            </div>
            <PhoneFrame className="mx-auto mt-10 w-[290px] lg:hidden">
              <div className="relative h-[540px]">{step.screen}<AppTabBar active={step.tab} /></div>
            </PhoneFrame>
          </article>
        ))}
      </div>

      <div className="hidden lg:block">
        <div className="sticky top-[calc(50vh-310px)] flex items-center gap-8">
          <div className="relative">
            {/* Brand block behind the phone, echoing the stationery */}
            <div className="absolute -inset-x-10 bottom-10 top-16" aria-hidden="true">
              <div className="diamond-pattern gold-corner size-full rounded-[7px] bg-brand" />
            </div>
            <PhoneFrame className="relative w-[300px]">
              <div className="relative h-[560px]">
                {STEPS.map((step, i) => (
                  <div key={step.title} aria-hidden={i !== active} className={`absolute inset-0 transition-all duration-500 ease-out ${i === active ? "translate-y-0 opacity-100" : i < active ? "-translate-y-6 opacity-0" : "translate-y-6 opacity-0"}`}>
                    {step.screen}
                    <AppTabBar active={step.tab} />
                  </div>
                ))}
              </div>
            </PhoneFrame>
          </div>
          <ol className="flex flex-col gap-2" aria-label="Steps">
            {STEPS.map((step, i) => (
              <li key={step.title} className={`w-1 rounded-[7px] transition-all duration-500 ${i === active ? "h-10 bg-gold" : "h-4 bg-brand-100"}`}><span className="sr-only">{step.title}</span></li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
