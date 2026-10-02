import { confirmPayout } from "@/lib/loans/payouts";
import { confirmPayment } from "@/lib/loans/repay";
import { webhookIsGenuine } from "@/lib/payments/flutterwave";

/**
 * Flutterwave webhook. Endpoint: /api/webhooks/flutterwave.
 * - charge.completed: a customer's repayment
 * - transfer.completed / transfer.disburse: a loan payout finished (or failed)
 * Checked against the secret hash in Console → Settings, then re-verified with Flutterwave's API,
 * so the body itself is never trusted for amounts or status.
 */
export async function POST(request: Request) {
  if (!(await webhookIsGenuine(request.headers.get("verif-hash")))) return new Response("Invalid signature", { status: 401 });
  const event = (await request.json()) as { event?: string; "event.type"?: string; data?: { tx_ref?: string; reference?: string } };
  const name = (event.event ?? event["event.type"] ?? "").toLowerCase();
  try {
    if (name === "charge.completed" && event.data?.tx_ref) await confirmPayment(event.data.tx_ref);
    else if (name.startsWith("transfer") && event.data?.reference) await confirmPayout(event.data.reference);
  } catch (error) {
    console.error("[flutterwave] webhook handling failed", name, error);
    return new Response("Retry later", { status: 500 });
  }
  return Response.json({ received: true });
}
