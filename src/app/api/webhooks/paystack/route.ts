import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { loanPayments } from "@/db/schema";
import { settlePayment } from "@/lib/loans/service";
import { getSetting } from "@/lib/settings";

/**
 * Paystack webhook (charge.success). Endpoint: /api/webhooks/paystack.
 * Paystack signs the raw body with your secret key (HMAC SHA-512).
 */
export async function POST(request: Request) {
  const key = await getSetting("paystackSecretKey");
  if (!key) return new Response("Paystack is not configured", { status: 503 });

  const body = await request.text();
  const expected = createHmac("sha512", key).update(body).digest("hex");
  const given = request.headers.get("x-paystack-signature") ?? "";
  if (given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(body) as { event: string; data: { reference: string; amount: number; currency: string; status: string } };
  if (event.event === "charge.success" && event.data.status === "success") {
    const [payment] = await (await getDb()).select().from(loanPayments).where(eq(loanPayments.reference, event.data.reference));
    if (payment && payment.amount === event.data.amount && event.data.currency === "NGN") await settlePayment(payment.reference);
  }
  return Response.json({ received: true });
}
