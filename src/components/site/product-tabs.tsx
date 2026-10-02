"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/logo";
import { ArrowRightIcon, CardIcon, CheckIcon, LandmarkIcon, PiggyIcon, TrendUpIcon } from "@/components/icons";

type TabId = "save" | "invest" | "borrow" | "pay";

const panelCard = "rounded-[7px] bg-white p-4 text-ink shadow-[0_30px_60px_-30px_rgba(0,0,0,.5)]";

const TABS: { id: TabId; label: string; icon: React.ReactNode; title: string; stat: string; statLabel: string; text: string; points: string[]; cta: string; visual: React.ReactNode }[] = [
  {
    id: "save",
    label: "Save",
    icon: <PiggyIcon className="size-5" />,
    title: "Save for the things that matter",
    stat: "14%",
    statLabel: "a year on target savings",
    text: "Rent, school fees, a wedding or that trip. Set a goal, automate it and lock it away.",
    points: ["Interest paid daily", "Automatic weekly or monthly saving", "Flexible or locked plans"],
    cta: "Start saving",
    visual: (
      <div className="space-y-3">
        {[{ n: "Rent Vault", p: 64, v: "₦1.15m of ₦1.8m" }, { n: "Emergency fund", p: 82, v: "₦820k of ₦1m" }, { n: "School fees", p: 41, v: "₦410k of ₦1m" }].map((g, i) => (
          <div key={g.n} className={`${panelCard} pop-in`} style={{ animationDelay: `${i * 90}ms` }}>
            <div className="flex justify-between text-sm"><span className="font-bold">{g.n}</span><span className="text-muted">{g.v}</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-[7px] bg-brand-50"><div className="grow-x h-full bg-brand" style={{ width: `${g.p}%`, animationDelay: `${200 + i * 90}ms` }} /></div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "invest",
    label: "Invest",
    icon: <TrendUpIcon className="size-5" />,
    title: "Grow your money with checked investments",
    stat: "21%",
    statLabel: "a year on Fixed Notes",
    text: "Fixed Notes, Treasury bills and money market funds, each reviewed by our investment team.",
    points: ["Start from ₦5,000", "Returns shown before you invest", "Track every naira in the app"],
    cta: "Start investing",
    visual: (
      <div className={`${panelCard} pop-in`}>
        <p className="text-xs text-muted">Portfolio value</p>
        <p className="font-display text-2xl font-extrabold">₦4,620,000</p>
        <svg viewBox="0 0 300 80" className="mt-3 h-24 w-full" aria-hidden="true">
          <path d="M0 70 C40 62 70 66 110 50 S180 42 220 28 S270 14 300 8 V80 H0Z" fill="#eef4ff" />
          <path d="M0 70 C40 62 70 66 110 50 S180 42 220 28 S270 14 300 8" fill="none" stroke="#0150c8" strokeWidth="2.5" strokeLinecap="round" className="draw-line" />
        </svg>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[["21%", "Fixed Note"], ["18.5%", "T-bills"], ["19.2%", "Money market"]].map(([r, n]) => (
            <div key={n} className="rounded-[7px] bg-canvas py-3"><p className="font-display text-lg font-extrabold text-brand">{r}</p><p className="text-[11px] text-muted">{n}</p></div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "borrow",
    label: "Borrow",
    icon: <LandmarkIcon className="size-5" />,
    title: "Loans in minutes, not weeks",
    stat: "₦50m",
    statLabel: "for businesses, ₦5m for individuals",
    text: "See your limit, pick an amount and tenor, and get paid into your wallet. No collateral for most customers.",
    points: ["Licensed by the FCCPC", "Decision in minutes", "Clear repayment schedule, repay early and pay less"],
    cta: "Check my limit",
    visual: (
      <div className="space-y-3">
        <div className={`${panelCard} pop-in`}>
          <p className="text-xs text-muted">You can borrow up to</p>
          <p className="font-display text-3xl font-extrabold text-brand">₦3,000,000</p>
          <div className="mt-4 space-y-2 text-sm">
            {[["Amount", "₦750,000"], ["Tenor", "6 months"], ["Monthly repayment", "₦140,750"]].map(([k, v]) => (
              <p key={k} className="flex justify-between border-t border-line pt-2"><span className="text-muted">{k}</span><span className="font-bold">{v}</span></p>
            ))}
          </div>
        </div>
        <div className="pop-in flex items-center gap-3 rounded-[7px] bg-gold p-4 text-ink" style={{ animationDelay: "150ms" }}>
          <span className="flex size-9 items-center justify-center rounded-full bg-ink text-gold"><CheckIcon className="size-4" /></span>
          <span><span className="block text-sm font-bold">₦750,000 approved</span><span className="block text-xs text-ink/70">Paid to your wallet in 4 minutes</span></span>
        </div>
      </div>
    ),
  },
  {
    id: "pay",
    label: "Pay & cards",
    icon: <CardIcon className="size-5" />,
    title: "Send, pay and spend for free",
    stat: "25",
    statLabel: "free transfers every month",
    text: "Instant transfers to any Nigerian bank, bills in seconds, and Naira virtual cards for safe online shopping.",
    points: ["Airtime, data, power and TV", "Virtual Verve cards", "Up to 3% cashback on bills"],
    cta: "Open free account",
    visual: (
      <div className="space-y-4">
        <div className="pop-in ml-auto max-w-sm rotate-[-4deg] rounded-[7px] bg-gold p-5 text-ink shadow-[0_30px_60px_-25px_rgba(0,0,0,.6)]">
          <div className="flex items-center justify-between"><LogoMark className="size-8" /><span className="text-sm font-extrabold italic">VERVE</span></div>
          <p className="mt-8 font-mono tracking-[.2em]">•••• •••• •••• 4821</p>
          <p className="mt-2 text-[11px] font-semibold">ADAEZE OKAFOR · 09/29</p>
        </div>
        <div className="pop-in flex flex-wrap gap-2" style={{ animationDelay: "150ms" }}>
          {["MTN", "Airtel", "Glo", "9mobile", "DStv", "GOtv", "IKEDC", "AEDC"].map((b) => (
            <span key={b} className="rounded-[7px] bg-white/10 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20">{b}</span>
          ))}
        </div>
      </div>
    ),
  },
];

function tabFromHash(): TabId | null {
  const hash = window.location.hash.slice(1);
  return TABS.some((t) => t.id === hash) ? (hash as TabId) : null;
}

export function ProductTabs() {
  const [tab, setTab] = useState<TabId>("save");
  const current = TABS.find((t) => t.id === tab)!;

  // Header links like /#invest open the matching tab.
  useEffect(() => {
    const sync = () => {
      const next = tabFromHash();
      if (next) setTab(next);
    };
    window.addEventListener("hashchange", sync);
    const initial = setTimeout(sync, 0);
    return () => {
      window.removeEventListener("hashchange", sync);
      clearTimeout(initial);
    };
  }, []);

  return (
    <div>
      <div role="tablist" aria-label="Products" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:px-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            aria-controls="product-panel"
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-3 rounded-[7px] border px-5 py-4 text-left font-display text-base font-bold transition ${tab === t.id ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-brand-300"}`}
          >
            <span className={`flex size-9 items-center justify-center rounded-[7px] ${tab === t.id ? "bg-white/15 text-gold" : "bg-brand-50 text-brand"}`}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div id="product-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="diamond-pattern relative mt-3 overflow-hidden rounded-[7px] bg-brand text-white">
        {/* The gold stripe sweeps in on every switch */}
        <div key={`stripe-${tab}`} className="stripe-sweep absolute -bottom-8 -right-24 h-20 w-[460px] -rotate-[30deg] bg-gold" aria-hidden="true" />
        <div key={tab} className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:p-14">
          <div className="page-in">
            <h3 className="max-w-lg font-display text-3xl font-extrabold leading-tight sm:text-[2.6rem]">{current.title}</h3>
            <p className="mt-6 flex items-baseline gap-3">
              <span className="font-display text-6xl font-extrabold text-gold">{current.stat}</span>
              <span className="max-w-[12rem] text-sm font-semibold text-white/80">{current.statLabel}</span>
            </p>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-white/80">{current.text}</p>
            <ul className="mt-6 space-y-2.5">
              {current.points.map((p) => (
                <li key={p} className="flex items-center gap-3 font-semibold"><span className="flex size-5 items-center justify-center rounded-[7px] bg-gold text-ink"><CheckIcon className="size-3" /></span>{p}</li>
              ))}
            </ul>
            <Link href="/register" className="mt-8 inline-flex items-center gap-2 rounded-[7px] bg-white px-6 py-3.5 font-bold text-brand transition hover:bg-gold hover:text-ink">
              {current.cta} <ArrowRightIcon className="size-4" />
            </Link>
          </div>
          <div className="lg:pb-6">{current.visual}</div>
        </div>
      </div>
    </div>
  );
}
