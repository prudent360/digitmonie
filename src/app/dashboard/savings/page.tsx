import type { Metadata } from "next";
import { LockIcon, PiggyIcon, PlusIcon, TrendUpIcon } from "@/components/icons";
import { Badge, Card, PageHeader, Progress, StatTile, buttonPrimary, buttonSecondary } from "@/components/ui";
import { formatDate, formatNaira } from "@/lib/format";
import { savingsPlans } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Savings" };

const PLAN_TYPES = [
  { name: "Flexible savings", rate: "10% p.a.", text: "Withdraw anytime. Interest paid daily.", icon: <PiggyIcon className="size-5" /> },
  { name: "Target savings", rate: "Up to 14% p.a.", text: "Save towards a goal on autopilot.", icon: <TrendUpIcon className="size-5" /> },
  { name: "Fixed lock", rate: "Up to 16% p.a.", text: "Lock funds away. No temptation.", icon: <LockIcon className="size-5" /> },
];

export default function SavingsPage() {
  const total = savingsPlans.reduce((s, p) => s + p.saved, 0);
  return (
    <div className="space-y-6">
      <PageHeader title="Savings" subtitle="Build habits that build wealth." actions={<button type="button" className={buttonPrimary}><PlusIcon className="size-4" /> New savings plan</button>} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Total saved" value={formatNaira(total)} change={0.091} icon={<PiggyIcon className="size-5" />} />
        <StatTile label="Interest earned (YTD)" value={formatNaira(146_820)} hint="Paid daily into each plan" icon={<TrendUpIcon className="size-5" />} />
        <StatTile label="Saving streak" value="23 weeks" hint="Longest: 31 weeks" icon={<LockIcon className="size-5" />} />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {savingsPlans.map((plan) => {
          const pct = plan.saved / plan.goal;
          return (
            <Card key={plan.id} className="flex flex-col p-5 transition hover:shadow-[0_20px_40px_-28px_rgba(6,31,77,.4)]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-lg font-bold text-ink">{plan.name}</p>
                  <p className="text-xs text-muted">{plan.frequency}</p>
                </div>
                {plan.locked ? <Badge tone="brand"><LockIcon className="size-3" /> Locked</Badge> : <Badge tone="success">Flexible</Badge>}
              </div>
              <div className="mt-6 flex items-end justify-between">
                <p className="font-display text-2xl font-bold tabular-nums text-ink">{formatNaira(plan.saved)}</p>
                <p className="text-sm font-semibold text-brand">{Math.round(pct * 100)}%</p>
              </div>
              <Progress value={pct} className="mt-3 h-2.5" />
              <p className="mt-2 text-xs text-muted">of {formatNaira(plan.goal)} goal</p>
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
                <div><dt className="text-xs text-muted">Interest</dt><dd className="font-semibold text-ink">{(plan.rate * 100).toFixed(0)}% p.a.</dd></div>
                <div><dt className="text-xs text-muted">Matures</dt><dd className="font-semibold text-ink">{plan.maturity ? formatDate(plan.maturity) : "Anytime"}</dd></div>
              </dl>
              <div className="mt-5 flex gap-2">
                <button type="button" className={`${buttonPrimary} flex-1`}>Top up</button>
                <button type="button" className={`${buttonSecondary} flex-1`}>{plan.locked ? "Details" : "Withdraw"}</button>
              </div>
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="font-display text-lg font-bold text-ink">Start a new plan</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {PLAN_TYPES.map((t) => (
            <button key={t.name} type="button" className="group rounded-[7px] border border-line bg-white p-5 text-left transition hover:border-brand hover:shadow-[0_20px_40px_-28px_rgba(1,80,200,.6)]">
              <span className="flex size-11 items-center justify-center rounded-[7px] bg-brand-50 text-brand transition group-hover:bg-brand group-hover:text-white">{t.icon}</span>
              <p className="mt-4 font-bold text-ink">{t.name}</p>
              <p className="mt-1 text-sm text-body">{t.text}</p>
              <p className="mt-3 text-sm font-bold text-brand">{t.rate}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
