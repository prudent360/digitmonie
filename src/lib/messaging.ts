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

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3002").replace(/\/$/, "");
}
