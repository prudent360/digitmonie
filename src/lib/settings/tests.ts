import "server-only";
import { dojahConfig } from "@/lib/kyc/dojah";
import { flw } from "@/lib/payments/flutterwave";
import type { Integration } from "./definitions";
import { getSetting } from ".";

export type TestResult = { ok: boolean; message: string };

/** A harmless read-only call to each provider, to prove the saved keys work. Never moves money or sends messages. */
export async function testIntegration(kind: Integration): Promise<TestResult> {
  try {
    switch (kind) {
      case "flutterwave": {
        const secret = await getSetting("flwSecretKey");
        if (!secret) return { ok: false, message: "Add the secret key first." };
        const banks = await flw<unknown[]>("/banks/NG");
        return { ok: true, message: `Connected (${secret.includes("TEST") ? "test mode" : "live mode"}). ${banks.length} Nigerian banks available for payouts.` };
      }
      case "paystack": {
        const key = await getSetting("paystackSecretKey");
        if (!key) return { ok: false, message: "Add the Paystack secret key first." };
        const res = await fetch("https://api.paystack.co/balance", { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
        return res.ok ? { ok: true, message: `Connected (${key.startsWith("sk_test") ? "test mode" : "live mode"}).` } : { ok: false, message: `Paystack rejected the key (${res.status}).` };
      }
      case "dojah": {
        const { base, headers } = await dojahConfig();
        const res = await fetch(`${base}/api/v1/balance`, { headers, cache: "no-store" });
        return res.ok ? { ok: true, message: `Connected to Dojah ${base.includes("sandbox") ? "sandbox" : "live"}.` } : { ok: false, message: `Dojah rejected the keys (${res.status}).` };
      }
      case "termii": {
        const key = await getSetting("termiiApiKey");
        if (!key) return { ok: false, message: "Add the Termii API key first." };
        const res = await fetch(`https://api.ng.termii.com/api/get-balance?api_key=${encodeURIComponent(key)}`, { cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as { balance?: number; currency?: string };
        return res.ok ? { ok: true, message: `Connected. SMS balance: ${body.currency ?? ""} ${body.balance ?? "?"}.` } : { ok: false, message: `Termii rejected the key (${res.status}).` };
      }
      case "resend": {
        const key = await getSetting("resendApiKey");
        if (!key) return { ok: false, message: "Add the Resend API key first." };
        const res = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
        return res.ok ? { ok: true, message: "Connected to Resend." } : { ok: false, message: `Resend rejected the key (${res.status}).` };
      }
    }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Couldn't connect." };
  }
}
