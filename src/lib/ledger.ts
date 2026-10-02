import "server-only";
import { asc, sql } from "drizzle-orm";
import { getDb } from "@/db";
import type { Db } from "@/db/client";
import { ledgerAccounts, ledgerEntries, ledgerLines } from "@/db/schema";

export { ACCOUNTS, type AccountKey } from "./ledger-accounts";
import { ACCOUNTS, type AccountKey } from "./ledger-accounts";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Executor = Db | Tx;
export type JournalLine = { account: AccountKey; debit?: number; credit?: number };

export async function ensureLedgerAccounts(db: Executor) {
  await db.insert(ledgerAccounts).values(Object.values(ACCOUNTS).map((a) => ({ ...a }))).onConflictDoNothing();
}

/**
 * Posts a balanced journal entry. Throws if debits ≠ credits (so a bug can never create or lose money
 * on paper). Posting the same `reference` twice does nothing.
 */
export async function postJournal(db: Executor, entry: { reference: string; description: string; loanId?: number | null; createdById?: number | null; lines: JournalLine[] }) {
  const lines = entry.lines.filter((l) => (l.debit ?? 0) > 0 || (l.credit ?? 0) > 0);
  const debits = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
  const credits = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  if (!lines.length || debits !== credits) throw new Error(`Unbalanced journal ${entry.reference}: debits ${debits} ≠ credits ${credits}`);
  if (lines.some((l) => !Number.isInteger(l.debit ?? 0) || !Number.isInteger(l.credit ?? 0))) throw new Error(`Journal ${entry.reference} has fractional kobo`);

  await ensureLedgerAccounts(db);
  const [created] = await db.insert(ledgerEntries)
    .values({ reference: entry.reference, description: entry.description, loanId: entry.loanId ?? null, createdById: entry.createdById ?? null })
    .onConflictDoNothing({ target: ledgerEntries.reference }).returning({ id: ledgerEntries.id });
  if (!created) return false;
  await db.insert(ledgerLines).values(lines.map((l) => ({ entryId: created.id, accountCode: ACCOUNTS[l.account].code, debit: l.debit ?? 0, credit: l.credit ?? 0 })));
  return true;
}

/** Balance of every account (debit-normal for assets/expenses, credit-normal for liabilities/income), plus whether the books balance. */
export async function trialBalance() {
  const db = await getDb();
  await ensureLedgerAccounts(db);
  const rows = await db.select({
    code: ledgerAccounts.code, name: ledgerAccounts.name, type: ledgerAccounts.type,
    debit: sql<number>`coalesce(sum(${ledgerLines.debit}), 0)`, credit: sql<number>`coalesce(sum(${ledgerLines.credit}), 0)`,
  }).from(ledgerAccounts).leftJoin(ledgerLines, sql`${ledgerLines.accountCode} = ${ledgerAccounts.code}`)
    .groupBy(ledgerAccounts.code, ledgerAccounts.name, ledgerAccounts.type).orderBy(asc(ledgerAccounts.code));
  const accounts = rows.map((r) => {
    const debit = Number(r.debit), credit = Number(r.credit);
    return { ...r, debit, credit, balance: r.type === "asset" || r.type === "expense" ? debit - credit : credit - debit };
  });
  const totalDebit = accounts.reduce((s, a) => s + a.debit, 0);
  const totalCredit = accounts.reduce((s, a) => s + a.credit, 0);
  return { accounts, totalDebit, totalCredit, balanced: totalDebit === totalCredit };
}
