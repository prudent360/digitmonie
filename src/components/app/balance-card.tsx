"use client";

import { useState } from "react";
import { LogoMark } from "@/components/logo";
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon, TrendUpIcon } from "@/components/icons";
import { formatNaira } from "@/lib/format";

/** The brand-blue balance card: hide/show balance and copy the account number. */
export function BalanceCard({ total, wallet, accountNumber, bank, change }: { total: number; wallet: number; accountNumber: string; bank: string; change: number }) {
  const [hidden, setHidden] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(accountNumber.replace(/\s/g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  }

  const mask = (v: number) => (hidden ? "₦ ••••••" : formatNaira(v));

  return (
    <div className="gold-corner diamond-pattern relative overflow-hidden rounded-[7px] bg-brand p-6 text-white shadow-[0_30px_60px_-30px_rgba(1,80,200,.8)]">
      <div className="absolute -right-16 -top-16 size-56 rounded-full bg-brand-400/40 blur-2xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm text-white/75">
            Total net worth
            <button type="button" onClick={() => setHidden((h) => !h)} className="rounded-[7px] p-1 hover:bg-white/10" aria-label={hidden ? "Show balance" : "Hide balance"}>
              {hidden ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            </button>
          </p>
          <p className="mt-2 font-display text-3xl font-extrabold tabular-nums sm:text-4xl">{mask(total)}</p>
          <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-gold">
            <TrendUpIcon className="size-3.5" /> +{(change * 100).toFixed(1)}% this year
          </p>
        </div>
        <LogoMark inverted className="size-10" />
      </div>
      <div className="relative mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-white/65">Wallet balance</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums">{mask(wallet)}</p>
        </div>
        <button type="button" onClick={copy} className="relative z-10 flex items-center gap-2 rounded-[7px] bg-white/10 px-3 py-2 text-left ring-1 ring-white/20 transition hover:bg-white/15">
          <span>
            <span className="block text-[10px] text-white/65">{bank}</span>
            <span className="block font-mono text-sm font-semibold tracking-wider">{accountNumber}</span>
          </span>
          {copied ? <CheckIcon className="size-4 text-gold" /> : <CopyIcon className="size-4" />}
        </button>
      </div>
    </div>
  );
}
