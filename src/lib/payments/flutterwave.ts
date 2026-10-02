import "server-only";
import { timingSafeEqual } from "node:crypto";
import { getSetting } from "@/lib/settings";

// Flutterwave v3 (https://developer.flutterwave.com). Keys live in Console → Settings → Flutterwave.
// Test keys (FLWSECK_TEST-…) use Flutterwave's test mode automatically.

export async function flutterwaveConfigured(): Promise<boolean> {
  return Boolean(await getSetting("flwSecretKey"));
}

export async function flw<T>(path: string, init?: RequestInit): Promise<T> {
  const secret = await getSetting("flwSecretKey");
  if (!secret) throw new Error("Flutterwave isn't configured.");
  const res = await fetch(`https://api.flutterwave.com/v3${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as { status?: string; message?: string; data?: T };
  if (!res.ok || body.status !== "success") throw new Error(`Flutterwave: ${body.message ?? res.status}`);
  return body.data as T;
}

export type FlwTransaction = { id: number; tx_ref: string; status: string; amount: number; currency: string };

/** Starts a hosted checkout and returns the link to send the customer to. */
export async function createCheckout(input: { reference: string; amountKobo: number; email: string; name: string; phone?: string | null; redirectUrl: string; title: string; description: string }) {
  const data = await flw<{ link: string }>("/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: input.reference,
      amount: (input.amountKobo / 100).toFixed(2),
      currency: "NGN",
      redirect_url: input.redirectUrl,
      payment_options: "card,banktransfer,ussd",
      customer: { email: input.email, name: input.name, phonenumber: input.phone ? `0${input.phone.slice(3)}` : undefined },
      customizations: { title: input.title, description: input.description },
    }),
  });
  return data.link;
}

/** Asks Flutterwave for the transaction's real state; never trust a redirect or webhook body on its own. */
export async function verifyTransaction(reference: string): Promise<FlwTransaction> {
  return flw<FlwTransaction>(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`);
}

/** Webhooks carry the secret hash you set in both Flutterwave and Console → Settings in the verif-hash header. */
export async function webhookIsGenuine(header: string | null): Promise<boolean> {
  const hash = await getSetting("flwWebhookHash");
  if (!hash || !header || header.length !== hash.length) return false;
  return timingSafeEqual(Buffer.from(header), Buffer.from(hash));
}

/* ---------- Banks, account lookup and transfers ---------- */

export type Bank = { code: string; name: string };

/** Confirms who owns an account. Returns the account name, or null if the account doesn't exist. */
export async function resolveAccount(bankCode: string, accountNumber: string): Promise<string | null> {
  try {
    const data = await flw<{ account_name: string }>("/accounts/resolve", { method: "POST", body: JSON.stringify({ account_number: accountNumber, account_bank: bankCode }) });
    return data.account_name?.trim() || null;
  } catch (error) {
    // Flutterwave answers "could not resolve" with a 400 for unknown accounts.
    if (error instanceof Error && /resolve|invalid|not found/i.test(error.message)) return null;
    throw error;
  }
}

export type FlwTransfer = { id: number; reference: string; status: "NEW" | "PENDING" | "SUCCESSFUL" | "FAILED" | string; amount: number; fee?: number; complete_message?: string };

export async function createTransfer(input: { bankCode: string; accountNumber: string; amountKobo: number; narration: string; reference: string; beneficiaryName: string; callbackUrl: string }) {
  return flw<FlwTransfer>("/transfers", {
    method: "POST",
    body: JSON.stringify({
      account_bank: input.bankCode, account_number: input.accountNumber, amount: input.amountKobo / 100, currency: "NGN", debit_currency: "NGN",
      narration: input.narration.slice(0, 100), reference: input.reference, beneficiary_name: input.beneficiaryName, callback_url: input.callbackUrl,
    }),
  });
}

export async function getTransfer(id: string | number) {
  return flw<FlwTransfer>(`/transfers/${encodeURIComponent(String(id))}`);
}

export async function ngnBalance(): Promise<{ available: number; ledger: number } | null> {
  if (!(await flutterwaveConfigured())) return null;
  const data = await flw<{ available_balance: number; ledger_balance: number }>("/balances/NGN");
  return { available: Math.round(data.available_balance * 100), ledger: Math.round(data.ledger_balance * 100) };
}

/* ---------- Listings for reconciliation ---------- */

type Page<T> = { data: T[]; meta?: { page_info?: { total_pages?: number } } };

async function flwPages<T>(path: string, maxPages = 25): Promise<T[]> {
  const secret = await getSetting("flwSecretKey");
  if (!secret) throw new Error("Flutterwave isn't configured.");
  const out: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetch(`https://api.flutterwave.com/v3${path}${path.includes("?") ? "&" : "?"}page=${page}`, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as Page<T> & { status?: string; message?: string };
    if (!res.ok || body.status !== "success") throw new Error(`Flutterwave: ${body.message ?? res.status}`);
    out.push(...(body.data ?? []));
    if (page >= (body.meta?.page_info?.total_pages ?? 1)) break;
  }
  return out;
}

export type FlwListedTransfer = { id: number; reference: string; amount: number; fee: number; status: string; created_at: string; full_name?: string };
export type FlwListedCharge = { id: number; tx_ref: string; amount: number; currency: string; status: string; created_at: string };

/** Transfers (payouts) between two dates inclusive, in the given status. */
export function listTransfers(from: string, to: string, status: "successful" | "failed") {
  return flwPages<FlwListedTransfer>(`/transfers?from=${from}&to=${to}&status=${status}`);
}

/** Successful collections (customer payments) between two dates inclusive. */
export function listCollections(from: string, to: string) {
  return flwPages<FlwListedCharge>(`/transactions?from=${from}&to=${to}&status=successful`);
}
