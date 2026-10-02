import { NextResponse, type NextRequest } from "next/server";
import { confirmPayment } from "@/lib/loans/repay";

/** Where Flutterwave sends the customer after paying. The webhook is the source of truth; this just speeds things up. */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("tx_ref") ?? "";
  let ok = false;
  try {
    ok = reference ? await confirmPayment(reference) : false;
  } catch (error) {
    console.error("[flutterwave] verify failed", error);
  }
  return NextResponse.redirect(new URL(ok ? `/dashboard/loans?paid=${encodeURIComponent(reference)}` : "/dashboard/loans?payment=pending", request.url));
}
