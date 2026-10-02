import "server-only";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { loanPayments, payouts, reconciliationItems, reconciliationRuns, type ReconIssue, type ReconSummary } from "@/db/schema";
import { logAudit } from "./audit";
import { can, type CurrentUser } from "./auth";
import { postJournal, trialBalance } from "./ledger";
import { ACCOUNTS } from "./ledger-accounts";
import { newReference, naira } from "./loans/common";
import { addMonths, todayIso } from "./loans/math";
import { confirmPayout } from "./loans/payouts";
import { confirmPayment } from "./loans/repay";
import { notifyStaff } from "./notifications";
import { flutterwaveConfigured, listCollections, listTransfers, ngnBalance } from "./payments/flutterwave";

export type Result = { ok: true; message: string; runId?: number } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });

const shiftDay = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
/** Start and end of a Lagos calendar day (UTC+1). */
const lagosDay = (iso: string) => ({ start: new Date(`${iso}T00:00:00+01:00`), end: new Date(`${shiftDay(iso, 1)}T00:00:00+01:00`) });
const inDay = (when: string | Date, iso: string) => { const t = new Date(when).getTime(), d = lagosDay(iso); return t >= d.start.getTime() && t < d.end.getTime(); };
const kobo = (naira: number) => Math.round(naira * 100);

type Item = { kind: "payout" | "collection"; reference: string; issue: ReconIssue; ourAmount: number | null; theirAmount: number | null; details?: Record<string, unknown> };

/**
 * Compares one Lagos day of Flutterwave activity with ours, by reference:
 *  - in Flutterwave but not ours (or ours shows a different status/amount)
 *  - ours says successful but Flutterwave has no such record
 * Flutterwave is queried for the day either side as well, so records near midnight still match.
 * Also snapshots Flutterwave's balance against the ledger's Flutterwave cash account.
 */
export async function runReconciliation(date: string, actorId: number | null): Promise<Result> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayIso()) return fail("Choose a day up to today.");
  const db = await getDb();
  const day = lagosDay(date);

  const save = async (status: "matched" | "issues" | "skipped" | "failed", summary: ReconSummary, items: Item[], balances: { theirs: number | null; ours: number | null }) => {
    return db.transaction(async (tx) => {
      const [existing] = await tx.select({ id: reconciliationRuns.id }).from(reconciliationRuns).where(eq(reconciliationRuns.date, date));
      if (existing) await tx.delete(reconciliationRuns).where(eq(reconciliationRuns.id, existing.id));
      const [run] = await tx.insert(reconciliationRuns).values({ date, status, summary, balanceTheirs: balances.theirs, balanceOurs: balances.ours, runById: actorId }).returning();
      if (items.length) await tx.insert(reconciliationItems).values(items.map((i) => ({ runId: run.id, ...i, details: i.details ?? null })));
      return run;
    });
  };

  if (!(await flutterwaveConfigured())) {
    const run = await save("skipped", { payoutsTheirs: 0, payoutsOurs: 0, collectionsTheirs: 0, collectionsOurs: 0, issues: 0, note: "Flutterwave isn't connected (Settings → Flutterwave)." }, [], { theirs: null, ours: null });
    return { ok: true, message: "Skipped: Flutterwave isn't connected.", runId: run.id };
  }

  try {
    const from = shiftDay(date, -1), to = shiftDay(date, 1);
    const [okTransfers, failedTransfers, charges, balance] = await Promise.all([listTransfers(from, to, "successful"), listTransfers(from, to, "failed"), listCollections(from, to), ngnBalance()]);
    const theirTransfers = new Map([...failedTransfers, ...okTransfers].map((t) => [t.reference, t]));
    const theirCharges = new Map(charges.filter((c) => c.currency === "NGN").map((c) => [c.tx_ref, c]));

    const ourPayouts = await db.select().from(payouts).where(and(eq(payouts.method, "flutterwave"), gte(payouts.createdAt, day.start), lt(payouts.createdAt, day.end)));
    const ourPayments = await db.select().from(loanPayments).where(and(eq(loanPayments.method, "flutterwave"), gte(loanPayments.createdAt, day.start), lt(loanPayments.createdAt, day.end)));
    const items: Item[] = [];

    // Payouts
    for (const p of ourPayouts) {
      const t = theirTransfers.get(p.reference);
      if (!t) {
        if (p.status === "successful") items.push({ kind: "payout", reference: p.reference, issue: "missing_theirs", ourAmount: p.amount, theirAmount: null, details: { ours: p.status } });
        continue;
      }
      const theirOk = t.status.toUpperCase() === "SUCCESSFUL";
      if (kobo(t.amount) !== p.amount) items.push({ kind: "payout", reference: p.reference, issue: "amount_mismatch", ourAmount: p.amount, theirAmount: kobo(t.amount) });
      else if (theirOk !== (p.status === "successful")) items.push({ kind: "payout", reference: p.reference, issue: "status_mismatch", ourAmount: p.amount, theirAmount: kobo(t.amount), details: { ours: p.status, theirs: t.status } });
    }
    const ourPayoutRefs = new Set((await db.select({ r: payouts.reference }).from(payouts).where(eq(payouts.method, "flutterwave"))).map((r) => r.r));
    for (const t of okTransfers) {
      if (inDay(t.created_at, date) && !ourPayoutRefs.has(t.reference)) {
        items.push({ kind: "payout", reference: t.reference, issue: "missing_ours", ourAmount: null, theirAmount: kobo(t.amount), details: { theirs: t.status, to: t.full_name ?? null, note: "Sent from Flutterwave but not by DigitMonie" } });
      }
    }

    // Collections
    for (const p of ourPayments) {
      const c = theirCharges.get(p.reference);
      if (!c) {
        if (p.status === "success") items.push({ kind: "collection", reference: p.reference, issue: "missing_theirs", ourAmount: p.amount, theirAmount: null });
        continue;
      }
      if (kobo(c.amount) !== p.amount) items.push({ kind: "collection", reference: p.reference, issue: "amount_mismatch", ourAmount: p.amount, theirAmount: kobo(c.amount) });
      else if (p.status !== "success") items.push({ kind: "collection", reference: p.reference, issue: "status_mismatch", ourAmount: p.amount, theirAmount: kobo(c.amount), details: { ours: p.status, theirs: c.status } });
    }
    const ourPaymentRefs = new Set((await db.select({ r: loanPayments.reference }).from(loanPayments).where(eq(loanPayments.method, "flutterwave"))).map((r) => r.r));
    for (const c of charges) {
      if (inDay(c.created_at, date) && !ourPaymentRefs.has(c.tx_ref)) {
        items.push({ kind: "collection", reference: c.tx_ref, issue: "missing_ours", ourAmount: null, theirAmount: kobo(c.amount), details: { note: "Received in Flutterwave with a reference DigitMonie doesn't know" } });
      }
    }

    const ledgerCash = (await trialBalance()).accounts.find((a) => a.code === ACCOUNTS.flutterwave.code)?.balance ?? 0;
    const summary: ReconSummary = {
      payoutsTheirs: okTransfers.filter((t) => inDay(t.created_at, date)).length, payoutsOurs: ourPayouts.length,
      collectionsTheirs: charges.filter((c) => inDay(c.created_at, date)).length, collectionsOurs: ourPayments.length, issues: items.length,
    };
    const run = await save(items.length ? "issues" : "matched", summary, items, { theirs: balance?.available ?? null, ours: ledgerCash });
    await logAudit({ actorId, action: "reconciliation.run", summary: `reconciled ${date}: ${items.length ? `${items.length} issue${items.length > 1 ? "s" : ""}` : "everything matched"}`, target: { type: "reconciliation", id: date } });
    if (items.length) await notifyStaff("finance.manage", { category: "finance", title: `Reconciliation for ${date} needs attention`, body: `${items.length} record${items.length > 1 ? "s don't" : " doesn't"} match Flutterwave.`, href: `/console/reconciliation?run=${run.id}` });
    return { ok: true, message: items.length ? `${items.length} issue${items.length > 1 ? "s" : ""} found.` : "Everything matched.", runId: run.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't reach Flutterwave.";
    await save("failed", { payoutsTheirs: 0, payoutsOurs: 0, collectionsTheirs: 0, collectionsOurs: 0, issues: 0, note: message }, [], { theirs: null, ours: null });
    return fail(`Couldn't reconcile: ${message}`);
  }
}

export async function recentRuns(limit = 30) {
  return (await getDb()).select().from(reconciliationRuns).orderBy(desc(reconciliationRuns.date)).limit(limit);
}

export async function runDetail(runId: number) {
  const db = await getDb();
  const [run] = await db.select().from(reconciliationRuns).where(eq(reconciliationRuns.id, runId));
  if (!run) return null;
  const items = await db.select().from(reconciliationItems).where(eq(reconciliationItems.runId, runId));
  return { run, items };
}

/**
 * Closes an issue. "recheck" asks Flutterwave again and applies the result (e.g. a payment whose
 * webhook was missed); otherwise it's closed with a note explaining what was done.
 */
export async function resolveItem(staff: CurrentUser, itemId: number, note: string, recheck: boolean): Promise<Result> {
  if (!can(staff, "finance.manage")) return fail("You can't resolve reconciliation issues.");
  const db = await getDb();
  const [item] = await db.select().from(reconciliationItems).where(eq(reconciliationItems.id, itemId));
  if (!item || item.resolvedAt) return fail("This issue is already resolved.");
  let outcome = "";
  if (recheck) {
    try {
      if (item.kind === "collection") outcome = (await confirmPayment(item.reference)) ? "Payment confirmed and applied." : "Flutterwave still doesn't show it as successful.";
      else outcome = `Transfer is ${(await confirmPayout(item.reference)) ?? "unknown to DigitMonie"}.`;
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Couldn't reach Flutterwave.");
    }
  }
  if (!recheck && note.trim().length < 5) return fail("Explain how this was resolved.");
  await db.update(reconciliationItems).set({ resolvedAt: new Date(), resolvedById: staff.id, resolutionNote: [outcome, note.trim()].filter(Boolean).join(" ") }).where(eq(reconciliationItems.id, itemId));
  await logAudit({ actorId: staff.id, action: "reconciliation.resolved", summary: `resolved ${item.kind} ${item.reference} (${item.issue}): ${[outcome, note.trim()].filter(Boolean).join(" ")}`, target: { type: "reconciliation", id: item.runId } });
  return { ok: true, message: outcome || "Resolved." };
}

/** Money put into (or taken out of) the business's Flutterwave or bank account, so cash in the ledger matches reality. */
export async function recordFunding(staff: CurrentUser, input: { account: "flutterwave" | "bank"; direction: "in" | "out"; amountKobo: number; note: string; date: string }): Promise<Result> {
  if (!can(staff, "finance.manage")) return fail("You can't record funding.");
  if (!(input.amountKobo > 0)) return fail("Enter an amount.");
  if (input.note.trim().length < 3) return fail("Add a reference or note (e.g. bank transfer reference).");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || input.date > todayIso() || input.date < addMonths(todayIso(), -12)) return fail("Choose a date in the last 12 months.");
  const cash = input.account;
  const lines = input.direction === "in"
    ? [{ account: cash, debit: input.amountKobo }, { account: "funding" as const, credit: input.amountKobo }]
    : [{ account: "funding" as const, debit: input.amountKobo }, { account: cash, credit: input.amountKobo }];
  await postJournal(await getDb(), { reference: newReference("FUND"), description: `${input.direction === "in" ? "Funding into" : "Withdrawal from"} ${cash === "flutterwave" ? "Flutterwave" : "bank account"} on ${input.date}: ${input.note.trim()}`, createdById: staff.id, lines });
  await logAudit({ actorId: staff.id, action: "finance.funding", summary: `recorded ${naira(input.amountKobo)} ${input.direction === "in" ? "into" : "out of"} the ${cash === "flutterwave" ? "Flutterwave" : "bank"} account: ${input.note.trim()}`, target: { type: "ledger", id: cash } });
  return { ok: true, message: "Recorded in the ledger." };
}
