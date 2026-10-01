import { BoltIcon, CardIcon, LandmarkIcon, PiggyIcon, PlusIcon, ReceiveIcon, SendIcon, TrendUpIcon } from "@/components/icons";
import { StatusBadge } from "@/components/ui";
import { formatDate, formatNaira } from "@/lib/format";
import type { Transaction, TxCategory } from "@/lib/mock-data";

const CATEGORY_ICON: Record<TxCategory, React.ReactNode> = {
  transfer: <SendIcon className="size-4" />,
  savings: <PiggyIcon className="size-4" />,
  investment: <TrendUpIcon className="size-4" />,
  loan: <LandmarkIcon className="size-4" />,
  bills: <BoltIcon className="size-4" />,
  card: <CardIcon className="size-4" />,
  deposit: <PlusIcon className="size-4" />,
};

export function TransactionRow({ tx, showStatus = true }: { tx: Transaction; showStatus?: boolean }) {
  const credit = tx.type === "credit";
  return (
    <li className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-canvas/70">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${credit ? "bg-success-soft text-success" : "bg-brand-50 text-brand"}`}>
        {tx.category === "transfer" && credit ? <ReceiveIcon className="size-4" /> : CATEGORY_ICON[tx.category]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{tx.title}</p>
        <p className="truncate text-xs text-muted">{tx.detail} · {formatDate(tx.date, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-bold tabular-nums ${credit ? "text-success" : "text-ink"}`}>{credit ? "+" : "−"}{formatNaira(tx.amount)}</p>
        {showStatus && tx.status !== "successful" && <div className="mt-1"><StatusBadge status={tx.status} /></div>}
      </div>
    </li>
  );
}
