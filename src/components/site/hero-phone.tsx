import { LogoMark } from "@/components/logo";
import { BellIcon, CheckIcon, LandmarkIcon, PiggyIcon, PlusIcon, SendIcon, TrendUpIcon } from "@/components/icons";
import { CountUp } from "./count-up";

/** A floating notification card around the phone; `delay` staggers the entrance. */
function Floater({ className, delay, children }: { className: string; delay: number; children: React.ReactNode }) {
  return (
    <div className={`pop-in absolute z-20 ${className}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="animate-float rounded-2xl bg-white p-3 shadow-[0_24px_50px_-20px_rgba(4,19,47,.55)] ring-1 ring-black/5" style={{ animationDelay: `${delay + 400}ms` }}>
        {children}
      </div>
    </div>
  );
}

const rows = [
  { label: "Salary — Paystack", amount: "+₦850,000", tone: "text-success", icon: <PlusIcon className="size-3.5" /> },
  { label: "T-bill interest", amount: "+₦38,720", tone: "text-success", icon: <TrendUpIcon className="size-3.5" /> },
  { label: "Rent Vault", amount: "−₦150,000", tone: "text-ink", icon: <PiggyIcon className="size-3.5" /> },
];

export function HeroPhone() {
  return (
    <div className="relative mx-auto h-[560px] w-full max-w-[460px]">
      {/* Glow and the gold stripe echo behind the phone */}
      <div className="absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-400/40 blur-3xl" />
      <div className="absolute -right-10 bottom-24 h-16 w-[380px] -rotate-[38deg] rounded-full bg-gold/90" />

      {/* Phone */}
      <div className="rise-in absolute left-1/2 top-2 z-10 w-[270px] -translate-x-1/2 rounded-[44px] bg-brand-950 p-2.5 shadow-[0_50px_100px_-30px_rgba(0,0,0,.6)]" style={{ animationDelay: "150ms" }}>
        <div className="overflow-hidden rounded-[36px] bg-canvas">
          <div className="flex items-center justify-between px-5 pb-2 pt-3 text-[10px] font-semibold text-ink">
            <span>9:41</span>
            <span className="h-5 w-20 rounded-full bg-brand-950" />
            <span>100%</span>
          </div>

          <div className="flex items-center justify-between px-4 pt-1">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand">AO</span>
              <div className="leading-tight">
                <p className="text-[9px] text-muted">Good morning</p>
                <p className="text-[11px] font-bold text-ink">Adaeze</p>
              </div>
            </div>
            <span className="relative rounded-full bg-white p-1.5 text-ink shadow-sm">
              <BellIcon className="size-3.5" />
              <span className="absolute right-1 top-1 size-1.5 rounded-full bg-danger" />
            </span>
          </div>

          {/* Balance card */}
          <div className="gold-corner diamond-pattern relative mx-4 mt-3 rounded-2xl bg-brand p-4 text-white">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-medium text-white/70">Total balance</p>
              <LogoMark inverted className="size-5" />
            </div>
            <p className="mt-1 font-display text-[22px] font-extrabold">
              <CountUp value={7319560} prefix="₦" />
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[9px] font-semibold text-gold">
              <TrendUpIcon className="size-3" /> +12.4% this year
            </p>
          </div>

          <div className="mx-4 mt-3 grid grid-cols-4 gap-2">
            {[
              { label: "Send", icon: <SendIcon className="size-4" /> },
              { label: "Save", icon: <PiggyIcon className="size-4" /> },
              { label: "Invest", icon: <TrendUpIcon className="size-4" /> },
              { label: "Borrow", icon: <LandmarkIcon className="size-4" /> },
            ].map((a) => (
              <div key={a.label} className="flex flex-col items-center gap-1">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white text-brand shadow-sm">{a.icon}</span>
                <span className="text-[8.5px] font-semibold text-body">{a.label}</span>
              </div>
            ))}
          </div>

          {/* Mini portfolio chart */}
          <div className="mx-4 mt-3 rounded-2xl bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-ink">Investments</p>
              <p className="text-[9px] font-semibold text-success">+₦186,000</p>
            </div>
            <svg viewBox="0 0 200 50" className="mt-1 h-12 w-full" aria-hidden="true">
              <defs>
                <linearGradient id="hero-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#0150c8" stopOpacity=".25" />
                  <stop offset="100%" stopColor="#0150c8" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 42 L25 38 L50 40 L75 30 L100 32 L125 22 L150 24 L175 12 L200 8 L200 50 L0 50Z" fill="url(#hero-fill)" className="rise-in" style={{ animationDelay: "1.2s" }} />
              <path d="M0 42 L25 38 L50 40 L75 30 L100 32 L125 22 L150 24 L175 12 L200 8" fill="none" stroke="#0150c8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="draw-line" />
            </svg>
          </div>

          <div className="mx-4 mb-5 mt-3 space-y-1.5">
            {rows.map((row, i) => (
              <div key={row.label} className="rise-in flex items-center justify-between rounded-xl bg-white px-2.5 py-2 shadow-sm" style={{ animationDelay: `${900 + i * 150}ms` }}>
                <span className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-lg bg-brand-50 text-brand">{row.icon}</span>
                  <span className="text-[9.5px] font-semibold text-ink">{row.label}</span>
                </span>
                <span className={`text-[9.5px] font-bold ${row.tone}`}>{row.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Floater className="-left-2 top-6 sm:-left-10" delay={1100}>
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-success-soft text-success"><CheckIcon className="size-4" /></span>
          <div>
            <p className="text-[11px] font-bold text-ink">Loan approved</p>
            <p className="text-[10px] text-muted">₦500,000 sent in 4 mins</p>
          </div>
        </div>
      </Floater>

      <Floater className="-right-1 top-56 sm:-right-6" delay={1400}>
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-10 items-center justify-center">
            <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden="true">
              <circle cx="18" cy="18" r="15" fill="none" stroke="#eef4ff" strokeWidth="4" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="#0150c8" strokeWidth="4" strokeLinecap="round" strokeDasharray="94.2" strokeDashoffset="34" />
            </svg>
            <span className="text-[9px] font-bold text-brand">64%</span>
          </span>
          <div>
            <p className="text-[11px] font-bold text-ink">Rent Vault</p>
            <p className="text-[10px] text-muted">₦1.15m of ₦1.8m</p>
          </div>
        </div>
      </Floater>

      <Floater className="bottom-10 left-2 sm:-left-2" delay={1700}>
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-gold-100 text-gold-700"><TrendUpIcon className="size-4" /></span>
          <div>
            <p className="text-[11px] font-bold text-ink">Up to 21% p.a.</p>
            <p className="text-[10px] text-muted">Fixed Note returns</p>
          </div>
        </div>
      </Floater>
    </div>
  );
}
