import "server-only";

/**
 * Outbound SMS and email. Uses Termii (SMS) and Resend (email) when their keys are set;
 * otherwise messages are written to the server log so local development works without them.
 */
export const smsConfigured = () => Boolean(process.env.TERMII_API_KEY);

export async function sendSms(to: string, message: string): Promise<void> {
  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) {
    console.info(`[sms → ${to}] ${message}`);
    return;
  }
  const res = await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, to, from: process.env.TERMII_SENDER_ID || "DigitMonie", sms: message, type: "plain", channel: "dnd" }),
  });
  if (!res.ok) throw new Error(`Termii responded ${res.status}`);
}

export async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`[email → ${to}] ${subject}\n${text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || "DigitMonie <hello@digitmonie.com>", to, subject, text }),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}`);
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3002").replace(/\/$/, "");
}
