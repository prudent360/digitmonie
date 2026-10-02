import "server-only";
import { randomBytes } from "node:crypto";
import type { Loan } from "@/db/schema";
import { creditBureau, type BureauEvent } from "@/lib/credit/bureau";
import { formatNaira } from "@/lib/format";
import { notifyCustomer } from "@/lib/notifications";
import { toNaira } from "./math";

export const naira = (kobo: number) => formatNaira(toNaira(kobo)).replace(/\.00$/, "");

export function newReference(prefix: string) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return `${prefix}-${Array.from(randomBytes(7), (b) => alphabet[b % alphabet.length]).join("")}`;
}

/** Loan news for a customer: in the app and by SMS (the SMS is `text`), plus email when `email` is set. */
export async function notify(userId: number, text: string, opts: { title: string; email?: boolean; href?: string }) {
  const body = text.charAt(0).toUpperCase() + text.slice(1);
  await notifyCustomer(userId, { category: "loan", title: opts.title, body, href: opts.href ?? "/dashboard/loans", sms: text, email: opts.email });
}

export async function report(loan: Loan, event: BureauEvent) {
  try {
    await (await creditBureau())?.report(loan, event);
  } catch (error) {
    console.error("[bureau] report failed", loan.reference, event, error);
  }
}
