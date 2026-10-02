import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { loanPayments, loans, payouts } from "@/db/schema";

export type TxStatus = "successful" | "pending" | "failed";
export type TxType = "credit" | "debit";
export type TxCategory = "loan" | "repayment";

export type Transaction = {
  id: string;
  title: string;
  detail: string;
  /** Naira. */
  amount: number;
  type: TxType;
  category: TxCategory;
  status: TxStatus;
  date: string;
  reference: string;
};

const METHOD: Record<string, string> = { flutterwave: "Card or transfer", paystack: "Card or transfer", manual: "Bank transfer", test: "Test payment" };

/** A customer's real money movements: loans paid out to them and repayments they made, newest first. */
export async function customerActivity(userId: number, limit = 100): Promise<Transaction[]> {
  const db = await getDb();
  const own = await db.select({ id: loans.id, reference: loans.reference }).from(loans).where(eq(loans.userId, userId));
  if (!own.length) return [];
  const ids = own.map((l) => l.id);
  const ref = new Map(own.map((l) => [l.id, l.reference]));

  const [sent, paid] = await Promise.all([
    db.select().from(payouts).where(and(inArray(payouts.loanId, ids), inArray(payouts.status, ["successful", "processing"]))).orderBy(desc(payouts.createdAt)).limit(limit),
    db.select().from(loanPayments).where(and(inArray(loanPayments.loanId, ids), inArray(loanPayments.status, ["success", "failed"]))).orderBy(desc(loanPayments.createdAt)).limit(limit),
  ]);

  const rows: Transaction[] = [
    ...sent.map((p): Transaction => ({
      id: `payout-${p.id}`,
      title: "Loan paid to you",
      detail: `${p.bankName} ••${p.accountNumber.slice(-4)} · Loan ${ref.get(p.loanId)}`,
      amount: p.amount / 100,
      type: "credit",
      category: "loan",
      status: p.status === "successful" ? "successful" : "pending",
      date: (p.completedAt ?? p.createdAt).toISOString(),
      reference: p.reference,
    })),
    ...paid.map((p): Transaction => ({
      id: `payment-${p.id}`,
      title: "Loan repayment",
      detail: `${METHOD[p.method] ?? "Payment"} · Loan ${ref.get(p.loanId)}`,
      amount: p.amount / 100,
      type: "debit",
      category: "repayment",
      status: p.status === "success" ? "successful" : "failed",
      date: (p.paidAt ?? p.createdAt).toISOString(),
      reference: p.reference,
    })),
  ];
  return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}
