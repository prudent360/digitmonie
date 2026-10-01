import type { Metadata } from "next";
import { BalanceCard } from "@/components/app/balance-card";
import { Field, inputClass } from "@/components/form";
import { BoltIcon, CardIcon, GlobeIcon, LockIcon, PhoneIcon, PlusIcon, ReceiptIcon, SendIcon } from "@/components/icons";
import { LogoMark } from "@/components/logo";
import { Avatar, Badge, Card, CardHeader, PageHeader, buttonPrimary, buttonSecondary } from "@/components/ui";
import { account } from "@/lib/mock-data";

export const metadata: Metadata = { title: "Wallet & transfers" };

const BENEFICIARIES = ["Chinedu Eze", "Mum", "Bola Ade", "Landlord", "Ifeoma N."];
const BILLS = [
  { label: "Airtime", icon: <PhoneIcon className="size-5" /> },
  { label: "Data", icon: <GlobeIcon className="size-5" /> },
  { label: "Electricity", icon: <BoltIcon className="size-5" /> },
  { label: "Cable TV", icon: <ReceiptIcon className="size-5" /> },
  { label: "Betting", icon: <PlusIcon className="size-5" /> },
  { label: "Internet", icon: <GlobeIcon className="size-5" /> },
];
const BANKS = ["Access Bank", "First Bank", "GTBank", "Kuda", "Moniepoint", "OPay", "UBA", "Wema Bank", "Zenith Bank"];

export default function WalletPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Wallet & transfers" subtitle="Fund your wallet, send money and pay bills." />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <BalanceCard total={account.walletBalance} wallet={account.walletBalance} accountNumber={account.accountNumber} bank={account.bank} change={0.084} />

          <Card className="scroll-mt-24" >
            <div id="fund" className="scroll-mt-24" />
            <CardHeader title="Add money" subtitle="Transfer to your dedicated account from any Nigerian bank" />
            <dl className="m-5 divide-y divide-line rounded-xl bg-canvas text-sm">
              {[["Bank", account.bank], ["Account number", account.accountNumber], ["Account name", `DigitMonie / ${account.holder}`]].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-3"><dt className="text-muted">{k}</dt><dd className="font-semibold text-ink">{v}</dd></div>
              ))}
            </dl>
            <div className="flex gap-2 px-5 pb-5">
              <button type="button" className={buttonSecondary}><CardIcon className="size-4" /> Fund with card</button>
              <button type="button" className={buttonSecondary}>USSD *123#</button>
            </div>
          </Card>
        </div>

        <Card>
          <div id="send" className="scroll-mt-24" />
          <CardHeader title="Send money" subtitle="Instant transfers to any bank. 25 free this month." action={<Badge tone="success">22 left</Badge>} />
          <div className="mt-4 flex gap-4 overflow-x-auto px-5 pb-1 no-scrollbar">
            <button type="button" className="flex shrink-0 flex-col items-center gap-1.5 text-xs font-semibold text-brand">
              <span className="flex size-12 items-center justify-center rounded-full border-2 border-dashed border-brand-200"><PlusIcon /></span>New
            </button>
            {BENEFICIARIES.map((b) => (
              <button key={b} type="button" className="flex shrink-0 flex-col items-center gap-1.5 text-xs font-semibold text-body hover:text-brand">
                <Avatar name={b} className="size-12 text-sm" />{b.split(" ")[0]}
              </button>
            ))}
          </div>
          <form className="space-y-4 p-5">
            <Field label="Bank">
              <select className={inputClass} defaultValue="">
                <option value="" disabled>Select bank</option>
                {BANKS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Account number"><input className={inputClass} inputMode="numeric" maxLength={10} placeholder="10-digit NUBAN" /></Field>
            <div className="flex items-center gap-2 rounded-xl bg-success-soft px-4 py-2.5 text-sm font-semibold text-success">✓ CHINEDU OKEKE EZE</div>
            <Field label="Amount"><input className={`${inputClass} font-display text-lg font-bold`} inputMode="decimal" placeholder="₦0.00" /></Field>
            <Field label="Narration (optional)"><input className={inputClass} placeholder="What's this for?" /></Field>
            <button type="button" className={`${buttonPrimary} w-full py-3.5`}><LockIcon className="size-4" /> Continue with PIN</button>
          </form>
        </Card>
      </div>

      <Card>
        <div id="bills" className="scroll-mt-24" />
        <CardHeader title="Pay bills" subtitle="Get up to 3% cashback in DigitPoints" />
        <div className="grid grid-cols-3 gap-3 p-5 sm:grid-cols-6">
          {BILLS.map((b) => (
            <button key={b.label} type="button" className="flex flex-col items-center gap-2 rounded-2xl bg-canvas py-5 text-xs font-semibold text-body transition hover:bg-brand-50 hover:text-brand">
              <span className="flex size-11 items-center justify-center rounded-xl bg-white text-brand shadow-sm">{b.icon}</span>{b.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div id="cards" className="scroll-mt-24" />
        <CardHeader title="Cards" subtitle="Virtual Naira cards for online payments" action={<button type="button" className={buttonSecondary}><PlusIcon className="size-4" /> New card</button>} />
        <div className="grid gap-6 p-5 md:grid-cols-[320px_1fr]">
          <div className="gold-corner diamond-pattern relative aspect-[1.6] rounded-2xl bg-brand p-5 text-white shadow-[0_24px_50px_-24px_rgba(1,80,200,.9)]">
            <div className="flex items-center justify-between"><LogoMark inverted className="size-8" /><span className="text-sm font-bold italic">VERVE</span></div>
            <p className="mt-8 font-mono tracking-[.2em]">•••• •••• •••• 4821</p>
            <div className="mt-4 flex gap-8 text-[11px]"><span><span className="block text-white/60">Card holder</span>ADAEZE OKAFOR</span><span><span className="block text-white/60">Expires</span>09/29</span></div>
          </div>
          <div className="grid content-start gap-3 sm:grid-cols-2">
            {[["Card balance", "₦42,500.00"], ["Monthly limit", "₦500,000"], ["Spent this month", "₦57,500"], ["Status", "Active"]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-canvas p-4"><p className="text-xs text-muted">{k}</p><p className="mt-1 font-bold text-ink">{v}</p></div>
            ))}
            <div className="flex gap-2 sm:col-span-2">
              <button type="button" className={buttonSecondary}><SendIcon className="size-4" /> Top up</button>
              <button type="button" className={buttonSecondary}><LockIcon className="size-4" /> Freeze card</button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
