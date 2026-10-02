import type { Metadata } from "next";
import Link from "next/link";
import { AlertIcon, CheckIcon } from "@/components/icons";
import { Card, CardHeader, PageHeader, StatTile, StatusBadge, Table } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { trialBalance } from "@/lib/ledger";
import { toNaira } from "@/lib/loans/math";
import { payoutsNeedingAttention, recentPayouts, recentRepayments } from "@/lib/money";
import { ngnBalance } from "@/lib/payments/flutterwave";

export const metadata: Metadata = { title: "Money" };

const ngn = (kobo: number) => `${kobo < 0 ? "−" : ""}₦${toNaira(Math.abs(kobo)).toLocaleString("en-NG", { minimumFractionDigits: kobo % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
const when = (d: Date | null) => (d ? formatDate(d.toISOString(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const METHOD = { flutterwave: "Flutterwave", paystack: "Paystack", manual: "Manual", test: "Test" } as const;

export default async function MoneyPage() {
  await requirePermission("transactions.view");
  let balance: Awaited<ReturnType<typeof ngnBalance>> = null;
  let balanceError: string | null = null;
  try {
    balance = await ngnBalance();
  } catch (error) {
    balanceError = error instanceof Error ? error.message : "Couldn't reach Flutterwave.";
  }
  const [tb, out, inn, attention] = await Promise.all([trialBalance(), recentPayouts(), recentRepayments(), payoutsNeedingAttention()]);
  const acct = (code: string) => tb.accounts.find((a) => a.code === code)?.balance ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Money" subtitle="Every naira paid out and received, and the ledger behind it." actions={<Link href="/console/reconciliation" className="text-sm font-semibold text-brand">Reconciliation →</Link>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Flutterwave balance" value={balance ? ngn(balance.available) : "—"} hint={balance ? `Ledger balance ${ngn(balance.ledger)}` : balanceError ?? "Not connected (Settings → Flutterwave)"} />
        <StatTile label="Loans outstanding (principal)" value={ngn(acct("1100"))} />
        <StatTile label="Interest earned" value={ngn(acct("4000"))} hint={`Fees ${ngn(acct("4010"))} · late fees ${ngn(acct("4020"))}`} />
        <StatTile label="Books" value={tb.balanced ? "Balanced" : "Out of balance"} hint={`Debits ${ngn(tb.totalDebit)} · credits ${ngn(tb.totalCredit)}`} />
      </div>

      {attention.length > 0 && (
        <Card className="border-danger/30">
          <CardHeader title="Payouts needing attention" subtitle="Stuck for over 15 minutes, or failed and not yet paid another way" />
          <ul className="divide-y divide-line pt-2 text-sm">
            {attention.map(({ p, loanRef, loanId, firstName, lastName }) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <span className="flex items-center gap-2"><AlertIcon className="size-4 text-danger" /><b>{firstName} {lastName}</b> · {ngn(p.amount)} · <span className="font-mono text-xs">{p.reference}</span>{p.failureReason && <span className="text-xs text-danger">· {p.failureReason}</span>}</span>
                <Link href={`/console/loans/${loanId}`} className="font-semibold text-brand">Open {loanRef}</Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Payouts" subtitle="Money sent to customers" />
          {out.length ? (
            <Table head={["Customer", "Amount", "Method", "When", "Status"]}>
              {out.map(({ p, loanId, firstName, lastName }) => (
                <tr key={p.id}>
                  <td className="px-5 py-3"><Link href={`/console/loans/${loanId}`} className="font-semibold text-ink hover:text-brand">{firstName} {lastName}</Link><p className="font-mono text-xs text-muted">{p.reference}</p></td>
                  <td className="whitespace-nowrap px-5 py-3 font-semibold tabular-nums">−{ngn(p.amount)}</td>
                  <td className="px-5 py-3 text-body">{METHOD[p.method]}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-body">{when(p.createdAt)}</td>
                  <td className="px-5 py-3"><StatusBadge status={p.status === "processing" ? "pending" : p.status} /></td>
                </tr>
              ))}
            </Table>
          ) : <p className="p-8 text-center text-sm text-muted">No payouts yet.</p>}
        </Card>
        <Card>
          <CardHeader title="Repayments" subtitle="Money received from customers" />
          {inn.length ? (
            <Table head={["Customer", "Amount", "Method", "When"]}>
              {inn.map(({ p, loanId, firstName, lastName }) => (
                <tr key={p.id}>
                  <td className="px-5 py-3"><Link href={`/console/loans/${loanId}`} className="font-semibold text-ink hover:text-brand">{firstName} {lastName}</Link><p className="font-mono text-xs text-muted">{p.reference}</p></td>
                  <td className="whitespace-nowrap px-5 py-3 font-semibold tabular-nums text-success">+{ngn(p.amount)}</td>
                  <td className="px-5 py-3 text-body">{METHOD[p.method]}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-body">{when(p.paidAt)}</td>
                </tr>
              ))}
            </Table>
          ) : <p className="p-8 text-center text-sm text-muted">No repayments yet.</p>}
        </Card>
      </div>

      <Card>
        <CardHeader title="Ledger" subtitle="Double-entry: every payout and repayment is recorded so that total debits always equal total credits." action={tb.balanced ? <span className="flex items-center gap-1 text-sm font-semibold text-success"><CheckIcon className="size-4" /> Balanced</span> : <span className="text-sm font-bold text-danger">Out of balance</span>} />
        <div className="mt-3">
          <Table head={["Account", "Type", "Debits", "Credits", "Balance"]}>
            {tb.accounts.map((a) => (
              <tr key={a.code}>
                <td className="px-5 py-3"><span className="font-mono text-xs text-muted">{a.code}</span> <span className="font-semibold text-ink">{a.name}</span></td>
                <td className="px-5 py-3 capitalize text-body">{a.type}</td>
                <td className="px-5 py-3 tabular-nums">{ngn(a.debit)}</td>
                <td className="px-5 py-3 tabular-nums">{ngn(a.credit)}</td>
                <td className="px-5 py-3 font-semibold tabular-nums">{ngn(a.balance)}</td>
              </tr>
            ))}
          </Table>
        </div>
        <p className="border-t border-line px-5 py-3 text-xs text-muted">A negative cash balance means more was paid out than was recorded coming in (funding Flutterwave or the bank account will be recorded once wallets arrive in Step 4b).</p>
      </Card>
    </div>
  );
}
