"use client";

import { useMemo, useState } from "react";
import { DownloadIcon, SearchIcon } from "@/components/icons";
import { Card, buttonSecondary } from "@/components/ui";
import { formatNaira } from "@/lib/format";
import type { Transaction } from "@/lib/mock-data";
import { TransactionRow } from "./transaction-row";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "credit", label: "Money in" },
  { id: "debit", label: "Money out" },
  { id: "savings", label: "Savings" },
  { id: "investment", label: "Investments" },
  { id: "loan", label: "Loans" },
  { id: "bills", label: "Bills" },
] as const;

export function TransactionsTable({ transactions }: { transactions: Transaction[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((tx) => {
      const byFilter = filter === "all" || tx.type === filter || tx.category === filter;
      const byQuery = !q || `${tx.title} ${tx.detail} ${tx.reference}`.toLowerCase().includes(q);
      return byFilter && byQuery;
    });
  }, [transactions, filter, query]);

  const inflow = rows.filter((r) => r.type === "credit" && r.status === "successful").reduce((s, r) => s + r.amount, 0);
  const outflow = rows.filter((r) => r.type === "debit" && r.status === "successful").reduce((s, r) => s + r.amount, 0);

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" onClick={() => setFilter(f.id)} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${filter === f.id ? "bg-brand text-white" : "bg-canvas text-body hover:text-brand"}`}>{f.label}</button>
          ))}
        </div>
        <label className="relative ml-auto w-full sm:w-64">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or reference" className="w-full rounded-[7px] border border-line py-2 pl-9 pr-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand-100" />
        </label>
        <button type="button" className={buttonSecondary}><DownloadIcon className="size-4" /> Statement</button>
      </div>
      <div className="grid grid-cols-2 divide-x divide-line border-b border-line text-center">
        <div className="p-3"><p className="text-xs text-muted">Money in</p><p className="font-bold tabular-nums text-success">+{formatNaira(inflow)}</p></div>
        <div className="p-3"><p className="text-xs text-muted">Money out</p><p className="font-bold tabular-nums text-ink">−{formatNaira(outflow)}</p></div>
      </div>
      {rows.length ? (
        <ul className="divide-y divide-line">{rows.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}</ul>
      ) : (
        <p className="p-12 text-center text-sm text-muted">No transactions match your filters.</p>
      )}
    </Card>
  );
}
