"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, ClockIcon, IdCardIcon, LandmarkIcon, PhoneIcon, PiggyIcon, TrendUpIcon } from "@/components/icons";

type View = { title: string; text: string; scene: React.ReactNode };

/** A small app window: the main picture in each view. */
function Window({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`absolute overflow-hidden rounded-[5px] bg-white shadow-[0_30px_70px_-30px_rgba(6,31,77,.45)] ring-1 ring-black/5 ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-line px-3.5 py-2.5">
        <span className="size-2 rounded-full bg-red-400" /><span className="size-2 rounded-full bg-amber-400" /><span className="size-2 rounded-full bg-emerald-400" />
        <span className="ml-auto text-[10px] font-semibold text-muted">{label}</span>
      </div>
      <div className="flex flex-col gap-2.5 bg-canvas p-3.5">{children}</div>
    </div>
  );
}

/** A floating card beside the window; `delay` staggers them in. */
function Float({ className, delay = 0, children }: { className: string; delay?: number; children: React.ReactNode }) {
  return (
    <div className={`showcase-float absolute ${className}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="showcase-bob flex items-center gap-2 rounded-[5px] bg-white px-3 py-2 text-[11px] font-bold text-ink shadow-[0_16px_34px_-14px_rgba(6,31,77,.5)] ring-1 ring-black/5" style={{ animationDelay: `${delay + 600}ms` }}>{children}</div>
    </div>
  );
}

const tick = <span className="flex size-5 items-center justify-center rounded-full bg-success text-white"><CheckIcon className="size-3" /></span>;
const card = "rounded-[5px] bg-white p-3 shadow-[0_1px_2px_rgba(6,31,77,.06)]";

function Fill({ pct, tone = "bg-brand" }: { pct: number; tone?: string }) {
  return <span className="block h-1.5 overflow-hidden rounded-full bg-brand-50"><span className={`showcase-fill block h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} /></span>;
}

const VIEWS: View[] = [
  {
    title: "Open your account",
    text: "Sign up with your phone number, verify with your BVN and get your own account number in minutes.",
    scene: <>
      <Window label="Verification" className="left-[60px] top-[50px] w-[400px]">
        <p className="text-[13px] font-bold text-ink">Let&apos;s verify it&apos;s you</p>
        <div className="showcase-rows flex flex-col gap-2">
          {[
            { label: "Phone number", detail: "0803 *** 5531", icon: <PhoneIcon className="size-3.5" />, done: true },
            { label: "BVN", detail: "Matched · Adaeze Okafor", icon: <IdCardIcon className="size-3.5" />, done: true },
            { label: "Selfie check", detail: "98% match", icon: <IdCardIcon className="size-3.5" />, done: true },
          ].map((row) => (
            <div key={row.label} className={`${card} flex items-center gap-3`}>
              <span className="flex size-8 items-center justify-center rounded-[5px] bg-brand-50 text-brand">{row.icon}</span>
              <span className="flex-1"><span className="block text-[11px] font-bold text-ink">{row.label}</span><span className="block text-[10px] text-muted">{row.detail}</span></span>
              {tick}
            </div>
          ))}
        </div>
        <div className="rounded-[5px] bg-brand p-3 text-white">
          <p className="text-[10px] text-white/70">Your DigitMonie account</p>
          <p className="mt-0.5 font-mono text-[15px] font-bold tracking-widest">8034 512 907</p>
        </div>
      </Window>
      <Float className="right-[24px] top-[24px]" delay={500}>{tick} Account ready</Float>
      <Float className="bottom-[34px] left-[20px]" delay={800}><ClockIcon className="size-4 text-brand" /> Done in 2 minutes</Float>
    </>,
  },
  {
    title: "Save towards your goals",
    text: "Set a target for rent, school fees or a trip. Automate deposits and earn up to 14% a year.",
    scene: <>
      <Window label="Savings" className="left-[50px] top-[44px] w-[410px]">
        <div className={`${card} flex items-center gap-4`}>
          <span className="relative flex size-16 shrink-0 items-center justify-center">
            <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90"><circle cx="18" cy="18" r="15" fill="none" stroke="#eef4ff" strokeWidth="3.5" /><circle cx="18" cy="18" r="15" fill="none" stroke="#0150c8" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="94.2" className="showcase-ring" style={{ ["--ring-to" as string]: "34" }} /></svg>
            <span className="text-[13px] font-bold text-brand">64%</span>
          </span>
          <span>
            <span className="block text-[13px] font-bold text-ink">Rent Vault</span>
            <span className="block text-[11px] text-muted">₦1,150,000 of ₦1,800,000</span>
            <span className="mt-1 block text-[10px] font-semibold text-success">14% p.a. · Locked till Jan</span>
          </span>
        </div>
        <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-muted">Auto-save</p>
        <div className="showcase-rows flex flex-col gap-1.5">
          {["Fri, 26 Sep", "Fri, 19 Sep", "Fri, 12 Sep"].map((d) => (
            <div key={d} className={`${card} flex items-center justify-between py-2`}>
              <span className="flex items-center gap-2 text-[11px] font-semibold text-ink"><PiggyIcon className="size-3.5 text-brand" />{d}</span>
              <span className="text-[11px] font-bold text-ink">₦37,500</span>
            </div>
          ))}
        </div>
      </Window>
      <Float className="right-[18px] top-[200px]" delay={600}><span className="text-success">+₦18,240</span> interest this month</Float>
    </>,
  },
  {
    title: "Invest and earn more",
    text: "Fixed Notes, Treasury bills and money market funds, with your returns shown before you commit.",
    scene: <>
      <Window label="Investments" className="left-[40px] top-[40px] w-[420px]">
        <div className={card}>
          <div className="flex items-end justify-between">
            <span><span className="block text-[10px] text-muted">Portfolio value</span><span className="block text-[17px] font-bold text-ink">₦4,620,000</span></span>
            <span className="text-[11px] font-bold text-success">+₦186,000</span>
          </div>
          <svg viewBox="0 0 300 60" className="mt-2 h-14 w-full" aria-hidden="true">
            <path d="M0 52 L40 46 L80 48 L120 34 L160 36 L200 22 L240 24 L300 6" fill="none" stroke="#0150c8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="draw-line" style={{ animationDelay: ".2s" }} />
          </svg>
        </div>
        <div className="showcase-rows grid grid-cols-3 gap-2">
          {[["Fixed Note", "21%"], ["T-bills", "18.5%"], ["Money market", "19.2%"]].map(([n, r]) => (
            <div key={n} className={card}><p className="text-[15px] font-extrabold text-brand">{r}</p><p className="text-[10px] text-muted">{n} · p.a.</p></div>
          ))}
        </div>
      </Window>
      <Float className="right-[20px] top-[18px]" delay={600}><TrendUpIcon className="size-4 text-success" /> Up to 21% a year</Float>
      <Float className="bottom-[40px] left-[16px]" delay={900}>{tick} ₦500,000 invested</Float>
    </>,
  },
  {
    title: "Borrow when you need it",
    text: "See your loan limit, pick an amount and tenor, and get the money in your wallet in minutes.",
    scene: <>
      <Window label="Loans" className="left-[60px] top-[40px] w-[400px]">
        <div className={card}>
          <p className="text-[10px] text-muted">You can borrow up to</p>
          <p className="text-[18px] font-extrabold text-brand">₦3,000,000</p>
          <div className="mt-2"><Fill pct={25} tone="bg-gold" /></div>
          <p className="mt-1 text-[10px] text-muted">₦750,000 selected</p>
        </div>
        <div className="showcase-rows flex flex-col gap-1.5">
          {[["Tenor", "6 months"], ["Monthly repayment", "₦140,750"], ["Interest rate", "3.5% monthly"]].map(([k, v]) => (
            <div key={k} className={`${card} flex justify-between py-2 text-[11px]`}><span className="text-muted">{k}</span><span className="font-bold text-ink">{v}</span></div>
          ))}
        </div>
        <span className="rounded-[5px] bg-brand py-2 text-center text-[11px] font-bold text-white">Get ₦750,000</span>
      </Window>
      <Float className="right-[16px] top-[150px]" delay={700}>{tick} Approved in 4 mins</Float>
      <Float className="bottom-[26px] left-[18px]" delay={1000}><LandmarkIcon className="size-4 text-brand" /> No collateral</Float>
    </>,
  },
];

export function HowItWorks() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  // Only animate once it's on screen, so the first view isn't over before anyone sees it.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={root} className="grid items-center gap-10 lg:grid-cols-[.85fr_1.15fr] lg:gap-14">
      <ol className="group/steps flex flex-col gap-2">
        {VIEWS.map((view, i) => {
          const active = i === index;
          return (
            <li key={view.title}>
              <button type="button" onClick={() => setIndex(i)} aria-current={active ? "true" : undefined} className={`flex w-full cursor-pointer flex-col gap-1.5 rounded-[5px] border p-4 text-left transition sm:p-5 ${active ? "border-line bg-white shadow-[0_20px_45px_-30px_rgba(6,31,77,.45)]" : "border-transparent hover:bg-white/60"}`}>
                <span className={`font-display text-lg font-bold ${active ? "text-brand" : "text-ink"}`}>{view.title}</span>
                <span className={`text-[15px] leading-relaxed text-muted ${active ? "" : "line-clamp-1 lg:line-clamp-none"}`}>{view.text}</span>
                {active && (
                  <span className="mt-2 block h-1 overflow-hidden rounded-full bg-brand-50">
                    {/* The bar filling moves on to the next view; it waits while off screen and while the list is hovered. */}
                    <span key={index} onAnimationEnd={() => setIndex((index + 1) % VIEWS.length)} className={`step-progress block h-full rounded-full bg-brand group-hover/steps:[animation-play-state:paused] ${visible ? "" : "[animation-play-state:paused]"}`} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="relative order-first flex items-center justify-center overflow-hidden rounded-[5px] border border-brand/10 bg-[linear-gradient(135deg,#e8f0ff_0%,#fdf8e7_100%)] px-4 py-10 sm:py-12 lg:order-none">
        <div aria-hidden="true" className="absolute left-1/2 top-1/2 size-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
        {/* Drawn at 520×400 and scaled down on narrow screens; the outer box reserves the scaled size. */}
        <div aria-hidden="true" className="relative h-[231px] w-[300px] sm:h-[400px] sm:w-[520px]">
          <div className="absolute left-0 top-0 h-[400px] w-[520px] origin-top-left scale-[.577] sm:scale-100">
            {visible && <div key={index} className="scene-in absolute inset-0">{VIEWS[index].scene}</div>}
          </div>
        </div>
        <p className="sr-only" aria-live="polite">{VIEWS[index].title}: {VIEWS[index].text}</p>
      </div>
    </div>
  );
}
