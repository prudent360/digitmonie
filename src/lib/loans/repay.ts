import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { loanPayments, loans } from "@/db/schema";
import type { CurrentUser } from "@/lib/auth";
import { siteUrl } from "@/lib/messaging";
import { createPayment, loanBalance, settlePayment } from "./service";

export const paystackConfigured = () => Boolean(process.env.PAYSTACK_SECRET_KEY);

async function paystack<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const body = (await res.json()) as { status: boolean; message?: string; data: T };
  if (!res.ok || !body.status) throw new Error(`Paystack: ${body.message ?? res.status}`);
  return body.data;
}

export type StartResult = { ok: true; redirectTo: string } | { ok: false; error: string };

/** Starts a repayment: Paystack checkout when configured, otherwise an instant test payment (development only). */
export async function startRepayment(user: CurrentUser, loanId: number, amountKobo: number): Promise<StartResult> {
  const [loan] = await (await getDb()).select().from(loans).where(eq(loans.id, loanId));
  if (!loan || loan.userId !== user.id || loan.status !== "active") return { ok: false, error: "This loan can't take repayments." };
  const { outstanding } = await loanBalance(loan.id);
  if (amountKobo < 10_000 && amountKobo !== outstanding) return { ok: false, error: "The smallest repayment is ₦100." };
  if (amountKobo > outstanding) return { ok: false, error: "That's more than you owe." };

  if (paystackConfigured()) {
    const payment = await createPayment(loan, amountKobo, "paystack", null);
    const data = await paystack<{ authorization_url: string }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email: user.email, amount: amountKobo, currency: "NGN", reference: payment.reference,
        callback_url: `${siteUrl()}/api/paystack/callback`,
        channels: ["card", "bank_transfer", "ussd", "bank"],
        metadata: { loan: loan.reference, purpose: "loan_repayment" },
      }),
    });
    return { ok: true, redirectTo: data.authorization_url };
  }
  if (process.env.NODE_ENV === "production") return { ok: false, error: "Online repayments aren't available yet. Please contact support." };
  const payment = await createPayment(loan, amountKobo, "test", null, "Development test payment");
  await settlePayment(payment.reference);
  return { ok: true, redirectTo: `/dashboard/loans?paid=${payment.reference}` };
}

/** Confirms a Paystack payment with Paystack itself (never trust the redirect alone) and applies it. */
export async function verifyPaystackPayment(reference: string): Promise<boolean> {
  const [payment] = await (await getDb()).select().from(loanPayments).where(eq(loanPayments.reference, reference));
  if (!payment || payment.method !== "paystack") return false;
  if (payment.status === "success") return true;
  const data = await paystack<{ status: string; amount: number; currency: string }>(`/transaction/verify/${encodeURIComponent(reference)}`);
  if (data.status !== "success" || data.amount !== payment.amount || data.currency !== "NGN") {
    if (data.status === "failed" || data.status === "abandoned") await (await getDb()).update(loanPayments).set({ status: "failed" }).where(eq(loanPayments.id, payment.id));
    return false;
  }
  await settlePayment(reference);
  return true;
}
