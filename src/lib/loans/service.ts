import "server-only";
import { and, asc, eq, inArray, isNull, lt, lte, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { creditProfiles, kycProfiles, loanDocuments, loanInstalments, loanPayments, loanProducts, loans, payouts, type Loan, type LoanInstalment, type LoanProduct, type LoanStatus } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { can, type CurrentUser } from "@/lib/auth";
import { creditBureau } from "@/lib/credit/bureau";
import { creditLimit } from "@/lib/credit/limits";
import { scoreApplication } from "@/lib/credit/score";
import { getTiers, tierNames } from "@/lib/kyc";
import { verifyTransactionPin } from "@/lib/pin";
import { decryptSecret } from "@/lib/secrets";
import { getSetting, getSettings } from "@/lib/settings";
import { naira, newReference, notify, report } from "./common";
import { formatDate } from "@/lib/format";
import { quoteLoan, todayIso } from "./math";
import { OPEN_STATUSES } from "./status";
import { nameScore } from "@/lib/kyc/matching";
import { postJournal, type JournalLine } from "@/lib/ledger";
import { bankName, lookupAccount } from "@/lib/payments/banks";
import { payoutAfterApproval } from "./payouts";
import { notifyStaff } from "@/lib/notifications";
import { settlePromises } from "@/lib/collections";

export type Outcome = { ok: true; message: string; loanId?: number } | { ok: false; error: string };
const fail = (error: string): Outcome => ({ ok: false, error });

/* ---------- Eligibility ---------- */

/**
 * What the customer can borrow and why they can't, if they can't. `forOfficer` words the reasons for a
 * credit officer preparing a loan, and allows customers who haven't finished setting up their account yet.
 */
export async function loanEligibility(user: CurrentUser, forOfficer = false) {
  const db = await getDb();
  const products = await db.select().from(loanProducts).where(eq(loanProducts.active, true)).orderBy(asc(loanProducts.minAmount));
  const { limit, history } = await creditLimit(user.id, user.kycTier);
  const [open] = await db.select().from(loans).where(and(eq(loans.userId, user.id), inArray(loans.status, [...OPEN_STATUSES, "defaulted"]))).limit(1);
  const say = (you: string, they: string) => (forOfficer ? they : you);
  let blocked: string | null = null;
  if (await getSetting<boolean>("pauseLoans")) blocked = say("We've paused new loan applications for a short while. Please check back soon.", "New loan applications are paused (Console → Settings).");
  else if (user.kycTier < 1) blocked = say("Verify your identity to see your loan limit.", "Verify the customer's identity first.");
  else if (user.status !== "active" && !(forOfficer && user.status === "pending")) blocked = say("Your account can't take new loans right now. Contact support.", `The customer's account is ${user.status}, so it can't take new loans.`);
  else if (open?.status === "defaulted") blocked = say("You can't take a new loan until your overdue loan is repaid.", "The customer has an overdue loan to repay first.");
  else if (open?.status === "awaiting_customer") blocked = say("You have a loan offer waiting for you to accept or decline.", "A loan is already waiting for the customer to accept.");
  else if (open) blocked = say("You already have a loan in progress. Repay it to apply again.", "The customer already has a loan in progress.");
  else if (history.defaulted) blocked = say("You can't take a new loan while a previous one is in default.", "The customer has a loan in default.");
  else if (limit <= 0) blocked = say("You don't have a loan limit yet.", "The customer doesn't have a loan limit yet.");
  return { products, limit, history, openLoan: open ?? null, blocked };
}

/* ---------- Applying ---------- */

export type ApplicationInput = {
  productId: number;
  amount: number; // kobo
  tenor: number;
  purpose: string;
  monthlyIncome: number; // kobo
  employmentType: string;
  employer: string;
  payoutBankCode: string;
  payoutAccount: string;
  acceptTerms: boolean;
  pin: string;
  statement: { fileName: string; mimeType: string; data: string; size: number } | null;
};

export const EMPLOYMENT_TYPES = ["Salaried (private)", "Salaried (government)", "Self-employed", "Business owner", "Student", "Other"];

/**
 * A customer's own application, or (with `preparedBy`) one a credit officer prepares for them. A prepared
 * application skips the terms and PIN here: it waits as "awaiting_customer" until the customer accepts it
 * in the app (acceptPreparedLoan), and is never approved automatically.
 */
export async function applyForLoan(user: CurrentUser, input: ApplicationInput, preparedBy?: CurrentUser): Promise<Outcome> {
  const { products, limit, history, blocked } = await loanEligibility(user, Boolean(preparedBy));
  if (blocked) return fail(blocked);
  const product = products.find((p) => p.id === input.productId);
  if (!product) return fail("Choose a loan type.");
  if (user.kycTier < product.minKycTier) return fail(`${product.name} needs ${(await tierNames())[product.minKycTier]}. Verify your identity to unlock it.`);
  const max = Math.min(product.maxAmount, limit);
  if (input.amount < product.minAmount) return fail(`The smallest ${product.name} is ${naira(product.minAmount)}.`);
  if (input.amount > max) return fail(`You can borrow up to ${naira(max)} right now.`);
  if (!product.tenors.includes(input.tenor)) return fail("Choose a repayment period.");
  if (input.purpose.trim().length < 3) return fail("Tell us what the loan is for.");
  if (input.monthlyIncome <= 0) return fail(preparedBy ? "Enter the customer's monthly income." : "Enter your monthly income.");
  if (!EMPLOYMENT_TYPES.includes(input.employmentType)) return fail("Choose the employment type.");
  // Re-check the account with the bank (never trust the name the browser sends) and that it's theirs.
  const payoutBank = await bankName(input.payoutBankCode);
  if (!payoutBank) return fail("Choose the bank to pay the loan into.");
  const db0 = await getDb();
  const [kycNames] = await db0.select({ first: kycProfiles.legalFirstName, last: kycProfiles.legalLastName }).from(kycProfiles).where(eq(kycProfiles.userId, user.id));
  const legal = { firstName: kycNames?.first ?? user.firstName, lastName: kycNames?.last ?? user.lastName };
  const account = await lookupAccount(input.payoutBankCode, input.payoutAccount, `${legal.firstName} ${legal.lastName}`);
  if (!account.ok) return fail(account.error);
  if (await getSetting<boolean>("payoutNameCheck")) {
    // How well the BVN first and last names appear among the account name's words (order and middle names don't matter).
    const score = nameScore(legal, { firstName: account.accountName, lastName: "" });
    if (score < Number(await getSetting("payoutNameMatch"))) return fail(`That account belongs to ${account.accountName}. Loans can only be paid into an account in ${preparedBy ? "the customer's" : "your"} own name.`);
  }
  const needsStatement = product.statementAbove != null && input.amount > product.statementAbove;
  if (needsStatement && !input.statement) return fail(`Upload ${preparedBy ? "the customer's" : "your"} last 6 months' bank statement for this amount.`);
  if (!preparedBy) {
    if (!input.acceptTerms) return fail("Read and accept the loan terms to continue.");
    const pin = await verifyTransactionPin(user, input.pin);
    if (!pin.ok) return fail(pin.error);
  }

  const quote = quoteLoan({ principal: input.amount, tenor: input.tenor, monthlyRateBps: product.monthlyRateBps, method: product.interestMethod, processingFeeBps: product.processingFeeBps });

  // Credit bureau check, if one is connected.
  const db = await getDb();
  const [kyc] = await db.select().from(kycProfiles).where(eq(kycProfiles.userId, user.id));
  const bureauProvider = await creditBureau();
  let bureau = null;
  if (bureauProvider && kyc?.bvnEncrypted) {
    try {
      bureau = await bureauProvider.check({ bvn: decryptSecret(kyc.bvnEncrypted), firstName: kyc.legalFirstName ?? user.firstName, lastName: kyc.legalLastName ?? user.lastName, dateOfBirth: kyc.dateOfBirth ?? "" });
    } catch (error) {
      console.error("[bureau] check failed", error);
    }
  }
  const score = scoreApplication({
    kycTier: user.kycTier, monthlyIncome: input.monthlyIncome, instalment: quote.instalment, history, bureau,
    accountAgeDays: Math.floor((Date.now() - user.createdAt.getTime()) / 86_400_000),
    rules: {
      ...await getSettings("autoApproveScore", "maxRepaymentToIncome").then((r) => ({ autoApproveScore: Number(r.autoApproveScore), maxRepaymentToIncome: Number(r.maxRepaymentToIncome) })),
      tierPoints: Object.fromEntries((await getTiers()).map((t) => [t.tier, t.score])),
    },
  });

  let status: LoanStatus = preparedBy ? "awaiting_customer" : "pending";
  let autoApproved = false;
  let declineReason: string | null = null;
  if (score.recommendation === "decline") {
    status = "declined";
    declineReason = score.hardStops[0] ?? "Your application doesn't meet our lending criteria right now.";
  } else if (!preparedBy && score.recommendation === "approve" && bureau && product.autoApproveUpTo != null && input.amount <= product.autoApproveUpTo && !needsStatement) {
    status = "approved";
    autoApproved = true;
  }

  await db.insert(creditProfiles).values({ userId: user.id, monthlyIncome: input.monthlyIncome, employmentType: input.employmentType, employer: input.employer.trim() || null })
    .onConflictDoUpdate({ target: creditProfiles.userId, set: { monthlyIncome: input.monthlyIncome, employmentType: input.employmentType, employer: input.employer.trim() || null, updatedAt: new Date() } });

  const now = new Date();
  const [loan] = await db.insert(loans).values({
    reference: newReference("LN"), userId: user.id, productId: product.id, status,
    principal: input.amount, tenorMonths: input.tenor, monthlyRateBps: product.monthlyRateBps, interestMethod: product.interestMethod,
    processingFee: quote.processingFee, lateFeeBps: product.lateFeeBps, totalInterest: quote.totalInterest, totalRepayable: quote.totalRepayable,
    instalment: quote.instalment, aprBps: quote.aprBps, purpose: input.purpose.trim().slice(0, 200),
    payoutBank, payoutBankCode: input.payoutBankCode, payoutAccount: input.payoutAccount, payoutName: account.accountName,
    declaredIncome: input.monthlyIncome, score, bureau, termsAcceptedAt: preparedBy ? null : now, preparedById: preparedBy?.id ?? null,
    autoApproved, approvedAt: autoApproved ? now : null, declineReason,
    closedAt: status === "declined" ? now : null,
  }).returning();
  if (input.statement) await db.insert(loanDocuments).values({ loanId: loan.id, kind: "bank_statement", ...input.statement });

  if (preparedBy) {
    const what = `${naira(input.amount)} ${product.name} over ${input.tenor} month${input.tenor > 1 ? "s" : ""} (${loan.reference})`;
    await logAudit({
      actorId: preparedBy.id, action: `loan.prepared_${status === "declined" ? "declined" : "awaiting_customer"}`,
      summary: `prepared ${what} for ${user.firstName} ${user.lastName} → ${status === "declined" ? "declined automatically" : "sent to the customer to accept"}`,
      target: { type: "loan", id: loan.id }, details: { score: score.score, band: score.band, recommendation: score.recommendation },
    });
    if (status === "declined") return fail(`This application was declined: ${declineReason}`);
    await notify(user.id, `${preparedBy.firstName} from DigitMonie has prepared a ${naira(input.amount)} loan for you. Sign in to see the full cost and accept it.`, { title: "A loan is ready for you to review", href: `/dashboard/loans/offer/${loan.id}` });
    return { ok: true, loanId: loan.id, message: "Sent to the customer. They'll see the full cost and repayment plan, and accept it in the app before it goes for review." };
  }

  await logAudit({
    actorId: user.id, action: `loan.applied_${status}`,
    summary: `applied for ${naira(input.amount)} ${product.name} over ${input.tenor} month${input.tenor > 1 ? "s" : ""} (${loan.reference}) → ${status === "approved" ? "approved automatically" : status === "declined" ? "declined automatically" : "sent for review"}`,
    target: { type: "loan", id: loan.id }, details: { score: score.score, band: score.band, recommendation: score.recommendation },
  });

  if (status === "approved") {
    await notify(user.id, `your ${naira(input.amount)} loan (${loan.reference}) is approved. We'll pay ${naira(quote.disbursed)} into your ${payoutBank} account shortly.`, { title: "Your loan is approved", email: { template: "loan_approved", vars: { reference: loan.reference, amount: naira(input.amount), payout: naira(quote.disbursed), bank: payoutBank } } });
    await payoutAfterApproval(loan);
    return { ok: true, loanId: loan.id, message: `Approved! We'll pay ${naira(quote.disbursed)} into your ${payoutBank} account shortly.` };
  }
  if (status === "declined") return fail(`We can't offer you this loan right now. ${declineReason}`);
  await notify(user.id, `we've received your loan application ${loan.reference}. We'll update you within one working day.`, { title: "Application received" });
  await notifyStaff("loans.review", { category: "loan", title: "New loan application", body: `${naira(input.amount)} ${product.name} from ${user.firstName} ${user.lastName}`, href: `/console/loans/${loan.id}` });
  return { ok: true, loanId: loan.id, message: "Application received. We'll update you within one working day." };
}

export async function cancelLoan(user: CurrentUser, loanId: number): Promise<Outcome> {
  const db = await getDb();
  const [sending] = await db.select({ id: payouts.id }).from(payouts).where(and(eq(payouts.loanId, loanId), eq(payouts.status, "processing")));
  if (sending) return fail("The money is already on its way to your bank, so this loan can't be cancelled.");
  const [before] = await db.select({ status: loans.status }).from(loans).where(and(eq(loans.id, loanId), eq(loans.userId, user.id)));
  const [loan] = await db.update(loans).set({ status: "cancelled", closedAt: new Date() })
    .where(and(eq(loans.id, loanId), eq(loans.userId, user.id), inArray(loans.status, ["awaiting_customer", "pending", "reviewed", "approved"])))
    .returning();
  if (!loan) return fail("This loan can no longer be cancelled.");
  const offer = before?.status === "awaiting_customer";
  await logAudit({ actorId: user.id, action: offer ? "loan.offer_declined" : "loan.cancelled", summary: offer ? `declined the loan prepared for them (${loan.reference})` : `cancelled their application ${loan.reference}`, target: { type: "loan", id: loan.id } });
  return { ok: true, message: offer ? "Loan declined. Nothing has been taken out in your name." : "Application cancelled." };
}

/** The customer accepts a loan a credit officer prepared for them, with their PIN. It then goes for review like any other. */
export async function acceptPreparedLoan(user: CurrentUser, loanId: number, input: { acceptTerms: boolean; pin: string }): Promise<Outcome> {
  const db = await getDb();
  const [loan] = await db.select().from(loans).where(and(eq(loans.id, loanId), eq(loans.userId, user.id), eq(loans.status, "awaiting_customer")));
  if (!loan) return fail("This loan is no longer waiting for you.");
  const [product] = await db.select().from(loanProducts).where(eq(loanProducts.id, loan.productId));
  if (!product?.active) return fail("This loan type is no longer offered. Ask your credit officer to prepare a new one.");
  if (user.status !== "active") return fail("Your account can't take new loans right now. Contact support.");
  if (await getSetting<boolean>("pauseLoans")) return fail("We've paused new loan applications for a short while. Please check back soon.");
  const { limit } = await creditLimit(user.id, user.kycTier);
  if (loan.principal > Math.min(limit, product.maxAmount)) return fail("This loan is now above your limit. Ask your credit officer to prepare a new one.");
  if (!input.acceptTerms) return fail("Read and accept the loan terms to continue.");
  const pin = await verifyTransactionPin(user, input.pin);
  if (!pin.ok) return fail(pin.error);

  const [accepted] = await db.update(loans).set({ status: "pending", termsAcceptedAt: new Date() })
    .where(and(eq(loans.id, loan.id), eq(loans.status, "awaiting_customer"))).returning();
  if (!accepted) return fail("This loan is no longer waiting for you.");
  await logAudit({ actorId: user.id, action: "loan.offer_accepted", summary: `accepted the terms of ${loan.reference} (${naira(loan.principal)}), prepared by a credit officer`, target: { type: "loan", id: loan.id } });
  await notify(user.id, `thanks for accepting loan ${loan.reference}. We'll update you within one working day.`, { title: "Application received" });
  await notifyStaff("loans.review", { category: "loan", title: "New loan application", body: `${naira(loan.principal)} ${product.name} from ${user.firstName} ${user.lastName} (prepared by a credit officer)`, href: `/console/loans/${loan.id}` });
  return { ok: true, loanId: loan.id, message: "Accepted. We'll review it and update you within one working day." };
}

/** The officer who prepared a loan withdraws it before the customer accepts. */
export async function withdrawPreparedLoan(staff: CurrentUser, loanId: number): Promise<Outcome> {
  const [loan] = await (await getDb()).update(loans).set({ status: "cancelled", closedAt: new Date() })
    .where(and(eq(loans.id, loanId), eq(loans.status, "awaiting_customer"), eq(loans.preparedById, staff.id))).returning();
  if (!loan) return fail("This loan is no longer waiting for the customer.");
  await logAudit({ actorId: staff.id, action: "loan.offer_withdrawn", summary: `withdrew ${loan.reference} before the customer accepted it`, target: { type: "loan", id: loan.id } });
  return { ok: true, message: "Withdrawn." };
}

/* ---------- Staff decisions ---------- */

async function loadLoan(id: number) {
  const [loan] = await (await getDb()).select().from(loans).where(eq(loans.id, id));
  return loan ?? null;
}

/** First pair of eyes: recommend approval (goes to an approver) or decline outright. */
export async function reviewLoan(staff: CurrentUser, loanId: number, decision: "approve" | "decline", note: string): Promise<Outcome> {
  if (!can(staff, "loans.review")) return fail("You can't review loans.");
  const loan = await loadLoan(loanId);
  if (!loan || loan.status !== "pending") return fail("This application has already been reviewed.");
  if (loan.preparedById === staff.id) return fail("You prepared this application, so someone else must review it.");
  if (decision === "decline" && note.trim().length < 5) return fail("Give the customer a reason for declining.");
  const db = await getDb();
  const now = new Date();
  if (decision === "decline") {
    await db.update(loans).set({ status: "declined", declinedById: staff.id, declineReason: note.trim(), reviewedById: staff.id, reviewedAt: now, reviewNote: note.trim(), closedAt: now }).where(eq(loans.id, loan.id));
    await logAudit({ actorId: staff.id, action: "loan.declined", summary: `declined ${loan.reference}: ${note.trim()}`, target: { type: "loan", id: loan.id } });
    await notify(loan.userId, `we couldn't approve your loan application ${loan.reference}. Open the app to see why.`, { title: "About your loan application", email: { template: "loan_declined", vars: { reference: loan.reference, reason: note.trim() } } });
    return { ok: true, message: "Declined. The customer has been told." };
  }
  await db.update(loans).set({ status: "reviewed", reviewedById: staff.id, reviewedAt: now, reviewNote: note.trim() || null }).where(eq(loans.id, loan.id));
  await logAudit({ actorId: staff.id, action: "loan.recommended", summary: `recommended ${loan.reference} for approval${note.trim() ? `: ${note.trim()}` : ""}`, target: { type: "loan", id: loan.id } });
  await notifyStaff("loans.approve", { category: "loan", title: "Loan waiting for your approval", body: `${loan.reference} (${naira(loan.principal)}) was recommended by ${staff.firstName} ${staff.lastName}`, href: `/console/loans/${loan.id}` });
  return { ok: true, message: "Recommended. A second person with approval rights must now approve it." };
}

/** Second pair of eyes: someone other than the reviewer approves or declines. */
export async function approveLoan(staff: CurrentUser, loanId: number, decision: "approve" | "decline", note: string): Promise<Outcome> {
  if (!can(staff, "loans.approve")) return fail("You can't approve loans.");
  const loan = await loadLoan(loanId);
  if (!loan || loan.status !== "reviewed") return fail("This loan isn't waiting for approval.");
  if (loan.reviewedById === staff.id) return fail("You reviewed this application, so someone else must approve it.");
  if (loan.preparedById === staff.id) return fail("You prepared this application, so someone else must approve it.");
  if (decision === "decline" && note.trim().length < 5) return fail("Give the customer a reason for declining.");
  const db = await getDb();
  const now = new Date();
  if (decision === "decline") {
    await db.update(loans).set({ status: "declined", declinedById: staff.id, declineReason: note.trim(), closedAt: now }).where(eq(loans.id, loan.id));
    await logAudit({ actorId: staff.id, action: "loan.declined", summary: `declined ${loan.reference} at approval: ${note.trim()}`, target: { type: "loan", id: loan.id } });
    await notify(loan.userId, `we couldn't approve your loan application ${loan.reference}. Open the app to see why.`, { title: "About your loan application", email: { template: "loan_declined", vars: { reference: loan.reference, reason: note.trim() } } });
    return { ok: true, message: "Declined. The customer has been told." };
  }
  const [approved] = await db.update(loans).set({ status: "approved", approvedById: staff.id, approvedAt: now }).where(eq(loans.id, loan.id)).returning();
  await logAudit({ actorId: staff.id, action: "loan.approved", summary: `approved ${loan.reference} (${naira(loan.principal)})`, target: { type: "loan", id: loan.id } });
  await notify(loan.userId, `your loan ${loan.reference} is approved. We'll pay ${naira(loan.principal - loan.processingFee)} into your ${loan.payoutBank} account shortly.`, { title: "Your loan is approved", email: { template: "loan_approved", vars: { reference: loan.reference, amount: naira(loan.principal), payout: naira(loan.principal - loan.processingFee), bank: loan.payoutBank } } });
  const payout = await payoutAfterApproval(approved);
  if (payout === "waiting") await notifyStaff("loans.approve", { category: "payout", title: "Loan ready to pay out", body: `${loan.reference}: send ${naira(loan.principal - loan.processingFee)} to ${loan.payoutName}`, href: `/console/loans/${loan.id}` });
  return { ok: true, message: payout === "sent" ? "Approved and sent to Flutterwave for payout." : "Approved. It's now ready to pay out." };
}

export async function markDefaulted(staff: CurrentUser, loanId: number, note: string): Promise<Outcome> {
  if (!can(staff, "loans.approve")) return fail("You can't change a loan's status.");
  if (note.trim().length < 5) return fail("Record why the loan is being marked as defaulted.");
  const db = await getDb();
  const [loan] = await db.update(loans).set({ status: "defaulted" }).where(and(eq(loans.id, loanId), eq(loans.status, "active"))).returning();
  if (!loan) return fail("Only active loans can be marked as defaulted.");
  await logAudit({ actorId: staff.id, action: "loan.defaulted", summary: `marked ${loan.reference} as defaulted: ${note.trim()}`, target: { type: "loan", id: loan.id } });
  await report(loan, "defaulted");
  return { ok: true, message: "Marked as defaulted and reported to the credit bureau." };
}

/* ---------- Balances and repayments ---------- */

export const owedOn = (i: Pick<LoanInstalment, "principal" | "interest" | "lateFee" | "paid">) => Math.max(0, i.principal + i.interest + i.lateFee - i.paid);

/**
 * Paying the whole loan off early: all unpaid principal and late fees, plus interest only for periods
 * that have started (anything due or overdue, and the current month). Interest for later months is waived.
 * Returns the amount and the instalments whose interest would be waived.
 */
export function earlySettlement(instalments: LoanInstalment[], today = todayIso()) {
  const unpaid = instalments.filter((i) => owedOn(i) > 0).sort((a, b) => a.n - b.n);
  const firstFuture = unpaid.find((i) => i.dueDate > today);
  const waived = unpaid.filter((i) => i.dueDate > today && i.id !== firstFuture?.id);
  const amount = unpaid.reduce((s, i) => s + owedOn(i), 0) - waived.reduce((s, i) => s + (i.interest - i.paidInterest), 0);
  return { amount, waived };
}

export async function loanBalance(loanId: number) {
  const instalments = await (await getDb()).select().from(loanInstalments).where(eq(loanInstalments.loanId, loanId)).orderBy(asc(loanInstalments.n));
  const outstanding = instalments.reduce((s, i) => s + owedOn(i), 0);
  const next = instalments.find((i) => i.status !== "paid") ?? null;
  const overdue = instalments.filter((i) => i.status === "overdue");
  const settlement = earlySettlement(instalments).amount;
  return { instalments, outstanding, settlement, next, overdueAmount: overdue.reduce((s, i) => s + owedOn(i), 0), overdueCount: overdue.length };
}

const CASH_ACCOUNT = { flutterwave: "flutterwave", paystack: "paystack", manual: "bank", test: "bank" } as const;

/**
 * Applies a successful payment to the oldest unpaid instalments first; within an instalment the late fee
 * is paid first, then interest, then principal. Posts the matching ledger entry and closes the loan when
 * nothing is left. Claims the payment row first so a webhook and a redirect can't both apply it.
 */
export async function settlePayment(reference: string): Promise<{ applied: boolean; loan?: Loan }> {
  const db = await getDb();
  const outcome = await db.transaction(async (tx) => {
    const [payment] = await tx.update(loanPayments).set({ status: "success", paidAt: new Date() })
      .where(and(eq(loanPayments.reference, reference), eq(loanPayments.status, "pending"))).returning();
    if (!payment) return null;
    let instalments = await tx.select().from(loanInstalments).where(eq(loanInstalments.loanId, payment.loanId)).orderBy(asc(loanInstalments.n));
    // Paying the early-settlement amount clears the loan: future months' interest is waived first.
    const settle = earlySettlement(instalments);
    if (settle.waived.length && payment.amount >= settle.amount) {
      for (const w of settle.waived) await tx.update(loanInstalments).set({ interest: w.paidInterest }).where(eq(loanInstalments.id, w.id));
      instalments = await tx.select().from(loanInstalments).where(eq(loanInstalments.loanId, payment.loanId)).orderBy(asc(loanInstalments.n));
    }
    let left = payment.amount;
    const split = { lateFee: 0, interest: 0, principal: 0 };
    for (const inst of instalments) {
      if (left <= 0) break;
      if (owedOn(inst) <= 0) continue;
      const late = Math.min(left, inst.lateFee - inst.paidLateFee); left -= late;
      const interest = Math.min(left, inst.interest - inst.paidInterest); left -= interest;
      const principal = Math.min(left, inst.principal - inst.paidPrincipal); left -= principal;
      split.lateFee += late; split.interest += interest; split.principal += principal;
      const paid = inst.paid + late + interest + principal;
      const fullyPaid = paid >= inst.principal + inst.interest + inst.lateFee;
      await tx.update(loanInstalments).set({
        paid, paidLateFee: inst.paidLateFee + late, paidInterest: inst.paidInterest + interest, paidPrincipal: inst.paidPrincipal + principal,
        ...(fullyPaid ? { status: "paid" as const, paidAt: new Date() } : {}),
      }).where(eq(loanInstalments.id, inst.id));
    }
    if (left > 0) throw new Error(`Payment ${reference} is ${left} kobo more than the loan balance`);
    const [current] = await tx.select().from(loans).where(eq(loans.id, payment.loanId));
    // Written-off principal has already left the books, so anything received now is a recovery.
    const lines: JournalLine[] = current.status === "written_off"
      ? [{ account: CASH_ACCOUNT[payment.method], debit: payment.amount }, { account: "recoveries", credit: payment.amount }]
      : [
          { account: CASH_ACCOUNT[payment.method], debit: payment.amount },
          { account: "lateFeeIncome", credit: split.lateFee },
          { account: "interestIncome", credit: split.interest },
          { account: "loansReceivable", credit: split.principal },
        ];
    const remaining = (await tx.select().from(loanInstalments).where(eq(loanInstalments.loanId, payment.loanId))).reduce((s, i) => s + owedOn(i), 0);
    const [loan] = remaining === 0 && current.status !== "written_off"
      ? await tx.update(loans).set({ status: "repaid", closedAt: new Date() }).where(eq(loans.id, payment.loanId)).returning()
      : [current];
    await postJournal(tx, { reference: `repayment:${payment.reference}`, description: `Repayment on ${loan.reference} (${payment.method})`, loanId: loan.id, createdById: payment.recordedById, lines });
    return { payment, loan, remaining };
  });
  if (!outcome) return { applied: false };
  const { payment, loan, remaining } = outcome;
  await settlePromises(loan);
  await logAudit({ actorId: payment.recordedById, action: "loan.payment", summary: `received ${naira(payment.amount)} on ${loan.reference} (${payment.method}, ${payment.reference})${remaining === 0 ? " · loan fully repaid" : ""}`, target: { type: "loan", id: loan.id } });
  await report(loan, remaining === 0 ? "repaid" : "payment");
  await notify(loan.userId, remaining === 0 ? `thank you! Your loan ${loan.reference} is fully repaid. Your limit may now increase.` : `we received ${naira(payment.amount)} for loan ${loan.reference}. ${naira(remaining)} left to pay.`, { title: remaining === 0 ? "Loan fully repaid" : "Payment received", email: remaining === 0 ? { template: "loan_repaid", vars: { reference: loan.reference } } : { template: "payment_received", vars: { reference: loan.reference, amount: naira(payment.amount), remaining: naira(remaining) } } });
  return { applied: true, loan };
}

export async function createPayment(loan: Loan, amount: number, method: "flutterwave" | "paystack" | "manual" | "test", recordedById: number | null, note?: string) {
  const [payment] = await (await getDb()).insert(loanPayments).values({ loanId: loan.id, amount, method, reference: newReference("DMP"), recordedById, note: note ?? null }).returning();
  return payment;
}

export async function recordManualPayment(staff: CurrentUser, loanId: number, amountKobo: number, note: string): Promise<Outcome> {
  if (!can(staff, "loans.collect")) return fail("You can't record repayments.");
  const loan = await loadLoan(loanId);
  if (!loan || !["active", "defaulted", "written_off"].includes(loan.status)) return fail("Repayments can only be recorded on unpaid loans.");
  const { settlement } = await loanBalance(loan.id);
  if (amountKobo <= 0) return fail("Enter the amount received.");
  if (amountKobo > settlement) return fail(`That's more than the ${naira(settlement)} needed to settle the loan today.`);
  if (note.trim().length < 4) return fail("Add the bank transfer reference or a note.");
  const payment = await createPayment(loan, amountKobo, "manual", staff.id, note.trim());
  await settlePayment(payment.reference);
  return { ok: true, message: `${naira(amountKobo)} recorded.` };
}

/* ---------- Daily upkeep (also run lazily on page loads) ---------- */

/** Marks instalments due/overdue and applies each overdue instalment's one-off late fee. */
export async function refreshInstalments(): Promise<{ newlyOverdue: number }> {
  const db = await getDb();
  const today = todayIso();
  await db.update(loanInstalments).set({ status: "due" }).where(and(eq(loanInstalments.status, "upcoming"), eq(loanInstalments.dueDate, today)));
  const late = await db.select({ i: loanInstalments, lateFeeBps: loans.lateFeeBps, loan: loans })
    .from(loanInstalments).innerJoin(loans, eq(loans.id, loanInstalments.loanId))
    .where(and(inArray(loanInstalments.status, ["upcoming", "due"]), lt(loanInstalments.dueDate, today), eq(loans.status, "active")));
  for (const { i, lateFeeBps, loan } of late) {
    const fee = i.lateFee || Math.round(((i.principal + i.interest) * lateFeeBps) / 10_000);
    await db.update(loanInstalments).set({ status: "overdue", lateFee: fee }).where(and(eq(loanInstalments.id, i.id), ne(loanInstalments.status, "paid")));
    await report(loan, "overdue");
    await notify(loan.userId, `your repayment of ${naira(owedOn({ ...i, lateFee: fee }))} for loan ${loan.reference} is overdue. Please pay today to avoid further impact on your credit record.`, { title: "Your repayment is overdue", email: { template: "repayment_overdue", vars: { reference: loan.reference, amount: naira(owedOn({ ...i, lateFee: fee })) } } });
  }
  return { newlyOverdue: late.length };
}

/** Friendly reminder before each due date (how many days before is set in Console → Settings). */
export async function sendDueReminders(): Promise<number> {
  const db = await getDb();
  const soon = new Date(Date.now() + Number(await getSetting("reminderDays")) * 86_400_000);
  const rows = await db.select({ i: loanInstalments, loan: loans }).from(loanInstalments).innerJoin(loans, eq(loans.id, loanInstalments.loanId))
    .where(and(eq(loanInstalments.status, "upcoming"), lte(loanInstalments.dueDate, todayIso(soon)), isNull(loanInstalments.reminderSentAt), eq(loans.status, "active")));
  for (const { i, loan } of rows) {
    await notify(loan.userId, `reminder: ${naira(owedOn(i))} for loan ${loan.reference} is due on ${i.dueDate}. Pay in the app to stay on track.`, { title: "Repayment due soon", email: { template: "repayment_due", vars: { reference: loan.reference, amount: naira(owedOn(i)), dueDate: formatDate(i.dueDate) } } });
    await db.update(loanInstalments).set({ reminderSentAt: new Date() }).where(eq(loanInstalments.id, i.id));
  }
  return rows.length;
}

export type { LoanProduct };
