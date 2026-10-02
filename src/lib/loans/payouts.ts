import "server-only";
import { and, desc, eq, lt } from "drizzle-orm";
import { getDb } from "@/db";
import { loanInstalments, loans, payouts, type Loan, type Payout } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { can, type CurrentUser } from "@/lib/auth";
import { postJournal } from "@/lib/ledger";
import { siteUrl } from "@/lib/messaging";
import { createTransfer, flutterwaveConfigured, getTransfer } from "@/lib/payments/flutterwave";
import { getSetting } from "@/lib/settings";
import { naira, newReference, notify, report } from "./common";
import { quoteLoan, todayIso } from "./math";

export type PayoutOutcome = { ok: true; message: string } | { ok: false; error: string };
const fail = (error: string): PayoutOutcome => ({ ok: false, error });
const sendAmount = (loan: Loan) => loan.principal - loan.processingFee;

export async function loanPayouts(loanId: number) {
  return (await getDb()).select().from(payouts).where(eq(payouts.loanId, loanId)).orderBy(desc(payouts.createdAt));
}

/**
 * The money has reached the customer: mark the payout successful, start the loan (schedule from today),
 * and post the ledger entry. Runs once per payout even if called repeatedly.
 */
async function completePayout(payoutId: number, actorId: number | null): Promise<Loan | null> {
  const db = await getDb();
  const start = todayIso();
  const loan = await db.transaction(async (tx) => {
    const [payout] = await tx.update(payouts).set({ status: "successful", completedAt: new Date() })
      .where(and(eq(payouts.id, payoutId), eq(payouts.status, "processing"))).returning();
    if (!payout) return null;
    const [active] = await tx.update(loans)
      .set({ status: "active", disbursedById: payout.initiatedById, disbursedAt: new Date(), disbursementReference: payout.reference })
      .where(and(eq(loans.id, payout.loanId), eq(loans.status, "approved"))).returning();
    if (!active) throw new Error(`Loan ${payout.loanId} isn't waiting for payout`);
    const { schedule } = quoteLoan({ principal: active.principal, tenor: active.tenorMonths, monthlyRateBps: active.monthlyRateBps, method: active.interestMethod, processingFeeBps: 0, start });
    await tx.insert(loanInstalments).values(schedule.map((l) => ({ loanId: active.id, n: l.n, dueDate: l.dueDate, principal: l.principal, interest: l.interest })));
    // Principal is owed to us; the amount sent leaves the cash account; the fee is earned.
    await postJournal(tx, {
      reference: `payout:${payout.reference}`, description: `Loan ${active.reference} paid out (${payout.method})`, loanId: active.id, createdById: actorId,
      lines: [
        { account: "loansReceivable", debit: active.principal },
        { account: payout.method === "flutterwave" ? "flutterwave" : "bank", credit: payout.amount },
        { account: "feeIncome", credit: active.processingFee },
      ],
    });
    return active;
  });
  if (!loan) return null;
  await report(loan, "disbursed");
  await notify(loan.userId, `we've sent ${naira(sendAmount(loan))} to your ${loan.payoutBank} account. Your first repayment of ${naira(loan.instalment)} is due one month from today.`);
  return loan;
}

/** Staff sent the money themselves (bank app or internet banking) and record the reference. */
export async function recordManualPayout(staff: CurrentUser, loanId: number, transferReference: string): Promise<PayoutOutcome> {
  if (!can(staff, "loans.approve")) return fail("You can't pay out loans.");
  const ref = transferReference.trim();
  if (ref.length < 4) return fail("Enter the bank transfer reference.");
  const db = await getDb();
  const [loan] = await db.select().from(loans).where(eq(loans.id, loanId));
  if (!loan || loan.status !== "approved") return fail("This loan isn't waiting for payout.");
  const [inFlight] = await db.select({ id: payouts.id }).from(payouts).where(and(eq(payouts.loanId, loan.id), eq(payouts.status, "processing")));
  if (inFlight) return fail("An automatic transfer is still in progress. Check its status first so the customer isn't paid twice.");
  const [taken] = await db.select({ id: payouts.id }).from(payouts).where(eq(payouts.reference, ref));
  if (taken) return fail("That transfer reference has already been used.");

  const [payout] = await db.insert(payouts).values({
    loanId: loan.id, method: "manual", amount: sendAmount(loan), bankName: loan.payoutBank, bankCode: loan.payoutBankCode,
    accountNumber: loan.payoutAccount, accountName: loan.payoutName, reference: ref, status: "processing", initiatedById: staff.id,
  }).returning();
  await completePayout(payout.id, staff.id);
  await logAudit({ actorId: staff.id, action: "loan.disbursed", summary: `paid out ${loan.reference} manually: ${naira(sendAmount(loan))} to ${loan.payoutBank} ${loan.payoutAccount} (ref ${ref})`, target: { type: "loan", id: loan.id } });
  return { ok: true, message: "Recorded. The repayment schedule has started." };
}

/**
 * Sends the loan through Flutterwave. `actor` is null when the system does it on approval.
 * Without Flutterwave (development only) the transfer succeeds instantly.
 */
export async function sendAutomaticPayout(loanId: number, actor: CurrentUser | null): Promise<PayoutOutcome> {
  if (actor && !can(actor, "loans.approve")) return fail("You can't pay out loans.");
  const db = await getDb();
  const [loan] = await db.select().from(loans).where(eq(loans.id, loanId));
  if (!loan || loan.status !== "approved") return fail("This loan isn't waiting for payout.");
  if (!loan.payoutBankCode) return fail("This application has no verified bank code, so it can only be paid out manually.");
  const [inFlight] = await db.select({ id: payouts.id }).from(payouts).where(and(eq(payouts.loanId, loan.id), eq(payouts.status, "processing")));
  if (inFlight) return fail("A transfer for this loan is already in progress.");

  const live = await flutterwaveConfigured();
  if (!live && process.env.NODE_ENV === "production") return fail("Flutterwave isn't connected. Add the keys in Settings or pay out manually.");
  const reference = newReference("DMT");
  const [payout] = await db.insert(payouts).values({
    loanId: loan.id, method: live ? "flutterwave" : "test", amount: sendAmount(loan), bankName: loan.payoutBank, bankCode: loan.payoutBankCode,
    accountNumber: loan.payoutAccount, accountName: loan.payoutName, reference, status: "processing", initiatedById: actor?.id ?? null,
  }).returning();
  await logAudit({ actorId: actor?.id ?? null, action: "payout.started", summary: `${actor ? "started" : "automatically started"} a transfer of ${naira(payout.amount)} for ${loan.reference} to ${loan.payoutBank} ${loan.payoutAccount} (${reference})`, target: { type: "loan", id: loan.id } });

  if (!live) {
    await completePayout(payout.id, actor?.id ?? null);
    return { ok: true, message: "Sent (development test transfer). The repayment schedule has started." };
  }
  try {
    const transfer = await createTransfer({
      bankCode: loan.payoutBankCode, accountNumber: loan.payoutAccount, amountKobo: payout.amount, reference,
      narration: `DigitMonie loan ${loan.reference}`, beneficiaryName: loan.payoutName, callbackUrl: `${siteUrl()}/api/webhooks/flutterwave`,
    });
    await db.update(payouts).set({ providerId: String(transfer.id) }).where(eq(payouts.id, payout.id));
    if (transfer.status === "FAILED") return await failPayout(payout, transfer.complete_message ?? "Flutterwave rejected the transfer.");
    if (transfer.status === "SUCCESSFUL") await completePayout(payout.id, actor?.id ?? null);
    return { ok: true, message: "Transfer sent to Flutterwave. The loan starts as soon as the bank confirms it." };
  } catch (error) {
    return failPayout(payout, error instanceof Error ? error.message : "Couldn't reach Flutterwave.");
  }
}

async function failPayout(payout: Payout, reason: string): Promise<PayoutOutcome> {
  const db = await getDb();
  const [failed] = await db.update(payouts).set({ status: "failed", failureReason: reason.slice(0, 300), completedAt: new Date() })
    .where(and(eq(payouts.id, payout.id), eq(payouts.status, "processing"))).returning();
  if (failed) await logAudit({ actorId: null, action: "payout.failed", summary: `transfer ${payout.reference} failed: ${reason}`, target: { type: "loan", id: payout.loanId } });
  return fail(`The transfer failed: ${reason}. You can try again or pay out manually.`);
}

/** Asks Flutterwave for a transfer's final state (from the webhook, the "Check status" button or the daily job). */
export async function confirmPayout(reference: string): Promise<Payout["status"] | null> {
  const db = await getDb();
  const [payout] = await db.select().from(payouts).where(eq(payouts.reference, reference));
  if (!payout) return null;
  if (payout.status !== "processing" || payout.method !== "flutterwave" || !payout.providerId) return payout.status;
  const transfer = await getTransfer(payout.providerId);
  if (transfer.status === "SUCCESSFUL" && Math.round(transfer.amount * 100) === payout.amount) {
    await completePayout(payout.id, payout.initiatedById);
    await logAudit({ actorId: null, action: "payout.successful", summary: `Flutterwave confirmed transfer ${payout.reference}`, target: { type: "loan", id: payout.loanId } });
    return "successful";
  }
  if (transfer.status === "FAILED") {
    await failPayout(payout, transfer.complete_message ?? "The bank rejected the transfer.");
    return "failed";
  }
  return "processing";
}

/** Called after any approval: pays out straight away when Settings say so and the amount is within the automatic limit. */
export async function payoutAfterApproval(loan: Loan): Promise<"sent" | "waiting"> {
  if ((await getSetting("payoutMode")) !== "automatic") return "waiting";
  if (sendAmount(loan) > Math.round(Number(await getSetting("autoPayoutMax")) * 100)) return "waiting";
  const result = await sendAutomaticPayout(loan.id, null);
  return result.ok ? "sent" : "waiting";
}

/** Daily job: re-checks transfers still processing after 15 minutes (in case a webhook was missed). */
export async function recheckStalePayouts(): Promise<number> {
  const stale = await (await getDb()).select().from(payouts)
    .where(and(eq(payouts.status, "processing"), eq(payouts.method, "flutterwave"), lt(payouts.createdAt, new Date(Date.now() - 15 * 60 * 1000))));
  for (const p of stale) await confirmPayout(p.reference).catch((e) => console.error("[payouts] recheck failed", p.reference, e));
  return stale.length;
}
