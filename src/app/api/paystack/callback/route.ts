import { NextResponse, type NextRequest } from "next/server";
import { verifyPaystackPayment } from "@/lib/loans/repay";

/** Where Paystack sends the customer after paying. The webhook is the source of truth; this just speeds things up. */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference") ?? "";
  let ok = false;
  try {
    ok = reference ? await verifyPaystackPayment(reference) : false;
  } catch (error) {
    console.error("[paystack] verify failed", error);
  }
  return NextResponse.redirect(new URL(ok ? `/dashboard/loans?paid=${encodeURIComponent(reference)}` : "/dashboard/loans?payment=pending", request.url));
}
