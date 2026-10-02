import "server-only";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users, type Loan } from "@/db/schema";
import { creditBureau, type BureauEvent } from "@/lib/credit/bureau";
import { formatNaira } from "@/lib/format";
import { sendSms } from "@/lib/messaging";
import { toNaira } from "./math";

export const naira = (kobo: number) => formatNaira(toNaira(kobo)).replace(/\.00$/, "");

export function newReference(prefix: string) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return `${prefix}-${Array.from(randomBytes(7), (b) => alphabet[b % alphabet.length]).join("")}`;
}

export async function notify(userId: number, text: string) {
  const [u] = await (await getDb()).select({ phone: users.phone }).from(users).where(eq(users.id, userId));
  if (u?.phone) await sendSms(u.phone, `DigitMonie: ${text}`).catch(() => {});
}

export async function report(loan: Loan, event: BureauEvent) {
  try {
    await (await creditBureau())?.report(loan, event);
  } catch (error) {
    console.error("[bureau] report failed", loan.reference, event, error);
  }
}
