import "server-only";
import { flutterwaveConfigured, flw, resolveAccount, type Bank } from "./flutterwave";

// Used when Flutterwave isn't connected (local development). Codes are the NIP/Flutterwave bank codes.
const FALLBACK: Bank[] = [
  { code: "044", name: "Access Bank" }, { code: "023", name: "Citibank" }, { code: "050", name: "Ecobank" }, { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank" }, { code: "214", name: "FCMB" }, { code: "00103", name: "Globus Bank" }, { code: "058", name: "GTBank" },
  { code: "030", name: "Heritage Bank" }, { code: "301", name: "Jaiz Bank" }, { code: "082", name: "Keystone Bank" }, { code: "50211", name: "Kuda" },
  { code: "50515", name: "Moniepoint" }, { code: "999992", name: "OPay" }, { code: "999991", name: "PalmPay" }, { code: "076", name: "Polaris Bank" },
  { code: "101", name: "Providus Bank" }, { code: "221", name: "Stanbic IBTC" }, { code: "068", name: "Standard Chartered" }, { code: "232", name: "Sterling Bank" },
  { code: "100", name: "SunTrust Bank" }, { code: "102", name: "Titan Trust Bank" }, { code: "032", name: "Union Bank" }, { code: "033", name: "UBA" },
  { code: "215", name: "Unity Bank" }, { code: "566", name: "VFD Microfinance Bank" }, { code: "035", name: "Wema Bank" }, { code: "057", name: "Zenith Bank" },
];

let cached: { at: number; banks: Bank[] } | null = null;

/** Nigerian banks from Flutterwave (refreshed every 12 hours), or the built-in list in development. */
export async function listBanks(): Promise<Bank[]> {
  if (!(await flutterwaveConfigured())) return FALLBACK;
  if (cached && Date.now() - cached.at < 12 * 60 * 60 * 1000) return cached.banks;
  try {
    const banks = (await flw<{ code: string; name: string }[]>("/banks/NG")).map((b) => ({ code: b.code, name: b.name.trim() })).sort((a, b) => a.name.localeCompare(b.name));
    cached = { at: Date.now(), banks };
    return banks;
  } catch (error) {
    console.error("[banks] falling back to built-in list", error);
    return FALLBACK;
  }
}

export async function bankName(code: string): Promise<string | null> {
  return (await listBanks()).find((b) => b.code === code)?.name ?? null;
}

export type LookupResult = { ok: true; accountName: string } | { ok: false; error: string };

/**
 * Looks up an account's name. Without Flutterwave (development only) any 10-digit number belongs to
 * `devName`, except numbers ending 0000, which don't exist.
 */
export async function lookupAccount(bankCode: string, accountNumber: string, devName: string): Promise<LookupResult> {
  if (!/^\d{10}$/.test(accountNumber)) return { ok: false, error: "Account numbers are 10 digits." };
  if (!(await bankName(bankCode))) return { ok: false, error: "Choose your bank." };
  if (!(await flutterwaveConfigured())) {
    if (process.env.NODE_ENV === "production") return { ok: false, error: "Bank account checks aren't available right now. Please try again later." };
    return accountNumber.endsWith("0000") ? { ok: false, error: "We couldn't find that account. Check the number and bank." } : { ok: true, accountName: devName.toUpperCase() };
  }
  try {
    const name = await resolveAccount(bankCode, accountNumber);
    return name ? { ok: true, accountName: name.toUpperCase() } : { ok: false, error: "We couldn't find that account. Check the number and bank." };
  } catch (error) {
    console.error("[banks] lookup failed", error);
    return { ok: false, error: "We couldn't check that account right now. Please try again." };
  }
}
