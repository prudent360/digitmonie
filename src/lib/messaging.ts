import "server-only";
import { getSetting } from "./settings";

/**
 * Outbound SMS through Termii when its key is set in Console → Settings (or the environment);
 * otherwise messages are written to the server log. Email lives in lib/email.ts.
 */
export async function smsConfigured(): Promise<boolean> {
  return Boolean(await getSetting("termiiApiKey"));
}

export async function sendSms(to: string, message: string): Promise<void> {
  const apiKey = await getSetting("termiiApiKey");
  if (!apiKey) {
    console.info(`[sms → ${to}] ${message}`);
    return;
  }
  const res = await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, to, from: await getSetting("termiiSenderId"), sms: message, type: "plain", channel: "dnd" }),
  });
  if (!res.ok) throw new Error(`Termii responded ${res.status}`);
}

/**
 * The public address used in links we send (invites, emails, payment callbacks).
 * NEXT_PUBLIC_SITE_URL wins; on Vercel we fall back to the project's production domain, never localhost.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) return `https://${production.replace(/\/$/, "")}`;
  return "http://localhost:3002";
}
