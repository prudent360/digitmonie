import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { loanPayments, loans } from "@/db/schema";
import { fullName, type CurrentUser } from "@/lib/auth";
import { siteUrl } from "@/lib/messaging";
import { createCheckout, flutterwaveConfigured, verifyTransaction } from "@/lib/payments/flutterwave";
import { getSetting } from "@/lib/settings";
import { createPayment, loanBalance, settlePayment } from "./service";

async function paystack<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await getSetting("paystackSecretKey")}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const body = (await res.json()) as { status: boolean; message?: string; data: T };
  if (!res.ok || !body.status) throw new Error(`Paystack: ${body.message ?? res.status}`);
  return body.data;
}

/** The provider chosen in Console → Settings → Repayments, if its keys are set. */
async function repaymentProvider(): Promise<"flutterwave" | "paystack" | null> {
  const chosen = await getSetting("repaymentProvider");
  if (chosen === "flutterwave" && (await flutterwaveConfigured())) return "flutterwave";
  if (chosen === "paystack" && (await getSetting("paystackSecretKey"))) return "paystack";
  return null;
}

export type StartResult = { ok: true; redirectTo: string } | { ok: false; error: string };

/** Starts a repayment with the chosen provider; in development without keys, settles an instant test payment. */
export async function startRepayment(user: CurrentUser, loanId: number, amountKobo: number): Promise<StartResult> {
  const [loan] = await (await getDb()).select().from(loans).where(eq(loans.id, loanId));
  if (!loan || loan.userId !== user.id || loan.status !== "active") return { ok: false, error: "This loan can't take repayments." };
  const { outstanding } = await loanBalance(loan.id);
  if (amountKobo < 10_000 && amountKobo !== outstanding) return { ok: false, error: "The smallest repayment is ₦100." };
  if (amountKobo > outstanding) return { ok: false, error: "That's more than you owe." };

  const provider = await repaymentProvider();
  try {
    if (provider === "flutterwave") {
      const payment = await createPayment(loan, amountKobo, "flutterwave", null);
      const link = await createCheckout({
        reference: payment.reference, amountKobo, email: user.email, name: fullName(user), phone: user.phone,
        redirectUrl: `${siteUrl()}/api/flutterwave/callback`, title: "DigitMonie", description: `Repayment for loan ${loan.reference}`,
      });
      return { ok: true, redirectTo: link };
    }
    if (provider === "paystack") {
      const payment = await createPayment(loan, amountKobo, "paystack", null);
      const data = await paystack<{ authorization_url: string }>("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify({ email: user.email, amount: amountKobo, currency: "NGN", reference: payment.reference, callback_url: `${siteUrl()}/api/paystack/callback`, channels: ["card", "bank_transfer", "ussd", "bank"], metadata: { loan: loan.reference } }),
      });
      return { ok: true, redirectTo: data.authorization_url };
    }
  } catch (error) {
    console.error("[repay] could not start checkout", error);
    return { ok: false, error: "We couldn't reach our payment partner. Please try again in a moment." };
  }
  if (process.env.NODE_ENV === "production") return { ok: false, error: "Online repayments aren't available yet. Please contact support." };
  const payment = await createPayment(loan, amountKobo, "test", null, "Development test payment");
  await settlePayment(payment.reference);
  return { ok: true, redirectTo: `/dashboard/loans?paid=${payment.reference}` };
}

/** Confirms a payment with the provider itself and applies it. Safe to call more than once. */
export async function confirmPayment(reference: string): Promise<boolean> {
  const db = await getDb();
  const [payment] = await db.select().from(loanPayments).where(eq(loanPayments.reference, reference));
  if (!payment) return false;
  if (payment.status === "success") return true;

  let status: "success" | "failed" | "pending" = "pending";
  if (payment.method === "flutterwave") {
    const tx = await verifyTransaction(reference);
    if (tx.status === "successful" && Math.round(tx.amount * 100) === payment.amount && tx.currency === "NGN") status = "success";
    else if (tx.status === "failed") status = "failed";
  } else if (payment.method === "paystack") {
    const tx = await paystack<{ status: string; amount: number; currency: string }>(`/transaction/verify/${encodeURIComponent(reference)}`);
    if (tx.status === "success" && tx.amount === payment.amount && tx.currency === "NGN") status = "success";
    else if (tx.status === "failed" || tx.status === "abandoned") status = "failed";
  } else return false;

  if (status === "failed") await db.update(loanPayments).set({ status: "failed" }).where(eq(loanPayments.id, payment.id));
  if (status !== "success") return false;
  await settlePayment(reference);
  return true;
}
