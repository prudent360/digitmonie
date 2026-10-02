import "server-only";
import { getSetting } from "./settings";

/**
 * Outbound SMS and email. Uses Termii (SMS) and Resend (email) when their keys are set in
 * Console → Settings (or the environment); otherwise messages are written to the server log.
 */
export async function smsConfigured(): Promise<boolean> {
  return Boolean(await getSetting("termiiApiKey"));
}

export async function emailConfigured(): Promise<boolean> {
  return Boolean(await getSetting("resendApiKey"));
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

export async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }): Promise<void> {
  const apiKey = await getSetting("resendApiKey");
  if (!apiKey) {
    console.info(`[email → ${to}] ${subject}\n${text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from: await getSetting("emailFrom"), to, subject, text }),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}`);
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3002").replace(/\/$/, "");
}
