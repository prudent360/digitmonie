/** A phone body with a status bar; the screen content goes inside. */
export function PhoneFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[42px] bg-brand-950 p-2.5 shadow-[0_50px_90px_-35px_rgba(4,19,47,.65)] ${className}`}>
      <div className="relative overflow-hidden rounded-[34px] bg-canvas">
        <div className="flex items-center justify-between px-6 pb-1 pt-3 text-[10px] font-semibold text-ink">
          <span>9:41</span>
          <span className="h-5 w-20 rounded-full bg-brand-950" />
          <span>100%</span>
        </div>
        {children}
      </div>
    </div>
  );
}

/** The title row at the top of an app screen. */
export function ScreenHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 pb-3 pt-2">
      <span className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-[5px] bg-white text-ink shadow-sm">‹</span>
        <span className="text-[13px] font-bold text-ink">{title}</span>
      </span>
      {action}
    </div>
  );
}

const APP_TABS = ["Home", "Save", "Invest", "Loans", "Pay"] as const;
export type AppTab = (typeof APP_TABS)[number];

/** The app's bottom navigation, pinned to the foot of the screen. */
export function AppTabBar({ active }: { active: AppTab }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-around border-t border-line bg-white px-2 pb-5 pt-2.5">
      {APP_TABS.map((tab) => (
        <span key={tab} className={`flex flex-col items-center gap-1 text-[9.5px] font-semibold ${tab === active ? "text-brand" : "text-muted"}`}>
          <span className={`h-1 w-5 rounded-[5px] ${tab === active ? "bg-brand" : "bg-transparent"}`} />
          {tab}
        </span>
      ))}
    </div>
  );
}
