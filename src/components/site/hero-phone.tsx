import { LogoMark } from "@/components/logo";
import { BellIcon, CheckIcon, ClockIcon, LandmarkIcon, PiggyIcon, ReceiptIcon, ReceiveIcon, TrendUpIcon } from "@/components/icons";
import { CountUp } from "./count-up";

/** A floating notification card around the phone; `delay` staggers the entrance. */
function Floater({ className, delay, children }: { className: string; delay: number; children: React.ReactNode }) {
  return (
    <div className={`pop-in absolute z-20 ${className}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="animate-float rounded-[7px] bg-white p-3 shadow-[0_24px_50px_-20px_rgba(4,19,47,.55)] ring-1 ring-black/5" style={{ animationDelay: `${delay + 400}ms` }}>
        {children}
      </div>
    </div>
  );
}

const rows = [
  { label: "Loan paid to you", amount: "+₦250,000", tone: "text-success", icon: <ReceiveIcon className="size-3.5" /> },
  { label: "Repayment · card", amount: "−₦90,944", tone: "text-ink", icon: <ReceiptIcon className="size-3.5" /> },
];

/** The hero's phone: a loan-first home screen, with savings and investing marked as coming soon. */
export function HeroPhone() {
  return (
    <div className="relative mx-auto h-[560px] w-full max-w-[460px]">
      {/* Glow and the gold stripe echo behind the phone */}
      <div className="absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-400/40 blur-3xl" />
      <div className="absolute -right-10 bottom-24 h-16 w-[380px] -rotate-[38deg] bg-gold/90" />

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

          {/* Limit card */}
          <div className="gold-corner diamond-pattern relative mx-4 mt-3 rounded-[7px] bg-brand p-4 text-white">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-medium text-white/70">You can borrow up to</p>
              <LogoMark inverted className="size-5" />
            </div>
            <p className="mt-1 font-display text-[22px] font-extrabold">
              <CountUp value={500000} prefix="₦" />
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[9px] font-semibold text-gold">
              <CheckIcon className="size-3" /> No collateral needed
            </p>
          </div>

          <div className="mx-4 mt-3 grid grid-cols-4 gap-2">
            {[
              { label: "Borrow", icon: <LandmarkIcon className="size-4" /> },
              { label: "Repay", icon: <ReceiptIcon className="size-4" /> },
              { label: "Save", icon: <PiggyIcon className="size-4" />, soon: true },
              { label: "Invest", icon: <TrendUpIcon className="size-4" />, soon: true },
            ].map((a) => (
              <div key={a.label} className="relative flex flex-col items-center gap-1">
                <span className={`flex size-9 items-center justify-center rounded-[7px] bg-white shadow-sm ${a.soon ? "text-muted" : "text-brand"}`}>{a.icon}</span>
                <span className="text-[8.5px] font-semibold text-body">{a.label}</span>
                {a.soon && <span className="absolute -top-1.5 right-0 rounded-[3px] bg-gold px-1 text-[6.5px] font-extrabold uppercase text-ink">Soon</span>}
              </div>
            ))}
          </div>

          {/* Current loan */}
          <div className="mx-4 mt-3 rounded-[7px] bg-white p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-ink">Your loan</p>
              <p className="text-[9px] font-semibold text-muted">1 of 3 paid</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-50"><div className="grow-x h-full w-1/3 bg-brand" style={{ animationDelay: "1s" }} /></div>
            <p className="mt-2 flex items-center gap-1 text-[9px] text-muted"><ClockIcon className="size-3" /> Next: ₦90,944 on 28 Oct</p>
          </div>

          <div className="mx-4 mb-5 mt-3 space-y-1.5">
            {rows.map((row, i) => (
              <div key={row.label} className="rise-in flex items-center justify-between rounded-[7px] bg-white px-2.5 py-2 shadow-sm" style={{ animationDelay: `${900 + i * 150}ms` }}>
                <span className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-[7px] bg-brand-50 text-brand">{row.icon}</span>
                  <span className="text-[9.5px] font-semibold text-ink">{row.label}</span>
                </span>
                <span className={`text-[9.5px] font-bold ${row.tone}`}>{row.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Floater className="-left-2 top-0 sm:-left-20" delay={1100}>
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-success-soft text-success"><CheckIcon className="size-4" /></span>
          <div>
            <p className="text-[11px] font-bold text-ink">Loan approved</p>
            <p className="text-[10px] text-muted">₦250,000 sent to your bank</p>
          </div>
        </div>
      </Floater>

      <Floater className="-right-1 top-[300px] sm:-right-6" delay={1400}>
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-brand"><ReceiptIcon className="size-4" /></span>
          <div>
            <p className="text-[11px] font-bold text-ink">Repay early</p>
            <p className="text-[10px] text-muted">and pay less interest</p>
          </div>
        </div>
      </Floater>

      <Floater className="bottom-10 left-2 sm:-left-2" delay={1700}>
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-gold-100 text-gold-700"><PiggyIcon className="size-4" /></span>
          <div>
            <p className="text-[11px] font-bold text-ink">Savings & investments</p>
            <p className="text-[10px] text-muted">Coming soon</p>
          </div>
        </div>
      </Floater>
    </div>
  );
}
