"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui";
import { CheckIcon, ChevronRightIcon, IdCardIcon, LockIcon, PhoneIcon, PiggyIcon } from "@/components/icons";
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
        { label: "Phone number", detail: "0803 *** 5531", icon: <PhoneIcon className="size-4" /> },
        { label: "BVN", detail: "Matched · Adaeze Okafor", icon: <IdCardIcon className="size-4" /> },
        { label: "Selfie check", detail: "98% face match", icon: <IdCardIcon className="size-4" /> },
      ].map((row) => (
        <div key={row.label} className={`${tile} flex items-center gap-3`}>
          <span className="flex size-9 items-center justify-center rounded-[7px] bg-brand-50 text-brand">{row.icon}</span>
          <span className="flex-1"><span className="block text-[12px] font-bold text-ink">{row.label}</span><span className="block text-[10.5px] text-muted">{row.detail}</span></span>
          {tick}
        </div>
      ))}
      <div className="gold-corner diamond-pattern relative rounded-[7px] bg-brand p-4 text-white">
        <p className="text-[10.5px] text-white/70">Your account is ready</p>
        <p className="mt-1 font-mono text-[18px] font-bold tracking-widest">8034 512 907</p>
        <p className="text-[10.5px] text-white/70">DigitMonie MFB · Adaeze Okafor</p>
      </div>
      <span className={primary}>Go to my dashboard</span>
    </div>
  </>
);

const SaveScreen = (
  <>
    <ScreenHeader title="Rent Vault" action={<span className="flex items-center gap-1 rounded-[7px] bg-brand-50 px-2 py-1 text-[10px] font-bold text-brand"><LockIcon className="size-3" />Locked</span>} />
    <div className="space-y-3 px-4">
      <div className={`${tile} flex flex-col items-center py-5`}>
        <span className="relative flex size-32 items-center justify-center">
          <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90"><circle cx="18" cy="18" r="15" fill="none" stroke="#eef4ff" strokeWidth="3" /><circle cx="18" cy="18" r="15" fill="none" stroke="#0150c8" strokeWidth="3" strokeLinecap="round" strokeDasharray="94.2" strokeDashoffset="34" /></svg>
          <span className="text-center"><span className="block font-display text-[22px] font-extrabold text-brand">64%</span><span className="block text-[10px] text-muted">of goal</span></span>
        </span>
        <p className="mt-3 text-[15px] font-bold text-ink">₦1,150,000</p>
        <p className="text-[10.5px] text-muted">of ₦1,800,000 · due 15 Jan</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className={tile}><p className="text-[14px] font-extrabold text-success">14%</p><p className="text-[10px] text-muted">interest p.a.</p></div>
        <div className={tile}><p className="text-[14px] font-extrabold text-ink">₦37,500</p><p className="text-[10px] text-muted">every Friday</p></div>
      </div>
      {["Fri, 26 Sep", "Fri, 19 Sep"].map((d) => (
        <div key={d} className={`${tile} flex items-center justify-between py-2.5`}>
          <span className="flex items-center gap-2 text-[11px] font-semibold text-ink"><PiggyIcon className="size-4 text-brand" />Auto-save · {d}</span>
          <span className="text-[11px] font-bold text-ink">+₦37,500</span>
        </div>
      ))}
    </div>
  </>
);

const InvestScreen = (
  <>
    <ScreenHeader title="Invest" />
    <div className="space-y-3 px-4">
      <div className="rounded-[7px] bg-brand-950 p-4 text-white">
        <p className="text-[10.5px] text-white/60">Portfolio value</p>
        <p className="font-display text-[22px] font-extrabold">₦4,620,000</p>
        <p className="text-[10.5px] font-semibold text-gold">+₦186,000 returns</p>
        <svg viewBox="0 0 240 60" className="mt-2 h-14 w-full" aria-hidden="true">
          <path d="M0 52 L30 46 L60 48 L95 34 L130 36 L165 22 L200 24 L240 6" fill="none" stroke="#f0ca56" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {[
        { n: "DigitMonie Fixed Note", d: "3 – 12 months · from ₦100k", r: "21%" },
        { n: "182-day Treasury Bill", d: "Government · from ₦50k", r: "18.5%" },
        { n: "Money Market Fund", d: "Flexible · from ₦5k", r: "19.2%" },
      ].map((p) => (
        <div key={p.n} className={`${tile} flex items-center gap-3`}>
          <span className="flex-1"><span className="block text-[11.5px] font-bold text-ink">{p.n}</span><span className="block text-[10px] text-muted">{p.d}</span></span>
          <span className="text-[13px] font-extrabold text-brand">{p.r}</span>
          <ChevronRightIcon className="size-4 text-muted" />
        </div>
      ))}
    </div>
  </>
);

const BorrowScreen = (
  <>
    <ScreenHeader title="Get a loan" />
    <div className="space-y-3 px-4">
      <div className={tile}>
        <p className="text-[10.5px] text-muted">How much do you need?</p>
        <p className="font-display text-[24px] font-extrabold text-ink">₦750,000</p>
        <div className="mt-2 h-1.5 rounded-full bg-brand-50"><div className="relative h-full w-1/4 rounded-full bg-brand"><span className="absolute -right-2 -top-1.5 size-4 rounded-full border-4 border-brand bg-white" /></div></div>
        <p className="mt-2 flex justify-between text-[10px] text-muted"><span>₦50k</span><span>Limit ₦3m</span></p>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {[3, 6, 9, 12].map((m) => <span key={m} className={`rounded-[7px] py-2 text-center text-[11px] font-bold ${m === 6 ? "bg-brand text-white" : "bg-white text-body"}`}>{m} mo</span>)}
      </div>
      <div className={`${tile} space-y-2 text-[11px]`}>
        {[["Monthly repayment", "₦140,750"], ["Interest rate", "3.5% monthly"], ["First repayment", "28 Oct"]].map(([k, v]) => (
          <p key={k} className="flex justify-between"><span className="text-muted">{k}</span><span className="font-bold text-ink">{v}</span></p>
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-[7px] bg-success-soft p-3 text-[11px] font-semibold text-success">{tick} You&apos;re pre-approved. No collateral.</div>
      <span className={primary}>Get ₦750,000</span>
    </div>
  </>
);

const PayScreen = (
  <>
    <ScreenHeader title="Transfer receipt" />
    <div className="space-y-3 px-4">
      <div className={`${tile} flex flex-col items-center py-6`}>
        <span className="flex size-14 items-center justify-center rounded-full bg-success text-white"><CheckIcon className="size-7" /></span>
        <p className="mt-3 font-display text-[22px] font-extrabold text-ink">₦45,000</p>
        <p className="text-[11px] text-muted">sent successfully</p>
      </div>
      <div className={`${tile} flex items-center gap-3`}>
        <Avatar name="Chinedu Eze" className="size-9 text-[11px]" />
        <span><span className="block text-[12px] font-bold text-ink">Chinedu Eze</span><span className="block text-[10.5px] text-muted">GTBank · 0123456789</span></span>
      </div>
      <div className={`${tile} space-y-2 text-[11px]`}>
        {[["Fee", "₦0 · 22 free left"], ["Reference", "DM-91822114"], ["Time", "29 Sep, 18:40"]].map(([k, v]) => (
          <p key={k} className="flex justify-between"><span className="text-muted">{k}</span><span className="font-bold text-ink">{v}</span></p>
        ))}
      </div>
      <span className={primary}>Share receipt</span>
    </div>
  </>
);

const STEPS = [
  { tab: "Home" as AppTab, title: "Open an account in 2 minutes", text: "All you need is your phone number and BVN. A quick selfie confirms it's you, and you get your own account number straight away.", points: ["No branch visit", "No paperwork", "Free to open"], screen: OpenAccountScreen },
  { tab: "Save" as AppTab, title: "Save for what matters", text: "Create a goal, choose how often to save, and let DigitMonie move the money for you. Lock it so you're not tempted.", points: ["Up to 14% a year", "Interest paid daily", "Daily, weekly or monthly"], screen: SaveScreen },
  { tab: "Invest" as AppTab, title: "Invest and watch it grow", text: "Pick from investments our team has checked. You see your returns before you put in a naira.", points: ["Up to 21% a year", "From ₦5,000", "Returns shown upfront"], screen: InvestScreen },
  { tab: "Loans" as AppTab, title: "Borrow when life happens", text: "See how much you can borrow, choose your amount and how long to pay back, and get the money in your wallet in minutes.", points: ["Up to ₦5m personal", "Decision in minutes", "No collateral"], screen: BorrowScreen },
  { tab: "Pay" as AppTab, title: "Send and pay, free", text: "Transfer to any Nigerian bank, buy airtime and data, and pay for power and TV. Your first 25 transfers every month are free.", points: ["Instant transfers", "25 free each month", "Receipts you can share"], screen: PayScreen },
];

/** Text scrolls on the left while one phone stays put on the right and switches screens. */
export function ScrollPhone() {
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
