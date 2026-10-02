import "server-only";
import { eq } from "drizzle-orm";
import { marked } from "marked";
import nodemailer from "nodemailer";
import { getDb } from "@/db";
import { emailLog, emailTemplates } from "@/db/schema";
import { COMMON_VARIABLES, EMAIL_TEMPLATES, REQUIRED_TEMPLATES, type TemplateKey } from "./email-templates";
import { siteUrl } from "./messaging";
import { getSetting, getSettings } from "./settings";

export type Vars = Record<string, string | number | null | undefined>;

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/* ---------- Configuration (Console → Settings → Email) ---------- */

export type EmailConfig = {
  driver: "resend" | "smtp" | "log";
  /** True when the chosen driver has what it needs; otherwise emails are only logged. */
  ready: boolean;
  apiKey: string;
  smtp: { host: string; port: number; security: "ssl" | "tls" | "none"; user: string; password: string };
  from: string;
  replyTo: string;
};

export async function emailConfig(): Promise<EmailConfig> {
  const s = await getSettings("emailDriver", "resendApiKey", "smtpHost", "smtpPort", "smtpSecurity", "smtpUser", "smtpPassword", "emailFromName", "emailFromAddress", "emailReplyTo", "supportEmail");
  const driver = (["resend", "smtp", "log"].includes(String(s.emailDriver)) ? s.emailDriver : "resend") as EmailConfig["driver"];
  const smtp = { host: String(s.smtpHost), port: Number(s.smtpPort) || 465, security: (String(s.smtpSecurity) || "ssl") as EmailConfig["smtp"]["security"], user: String(s.smtpUser), password: String(s.smtpPassword) };
  const ready = driver === "resend" ? Boolean(s.resendApiKey) : driver === "smtp" ? Boolean(smtp.host && smtp.user && smtp.password) : false;
  const name = String(s.emailFromName) || "DigitMonie";
  const address = String(s.emailFromAddress) || process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] || (driver === "smtp" && smtp.user.includes("@") ? smtp.user : "onboarding@resend.dev");
  return { driver, ready, apiKey: String(s.resendApiKey), smtp, from: `${name} <${address}>`, replyTo: String(s.emailReplyTo) || String(s.supportEmail) };
}

export async function emailConfigured(): Promise<boolean> {
  return (await emailConfig()).ready;
}

/* ---------- Templates ---------- */

export async function getTemplate(key: TemplateKey): Promise<{ subject: string; body: string; customised: boolean; enabled: boolean }> {
  const [row] = await (await getDb()).select().from(emailTemplates).where(eq(emailTemplates.key, key));
  const def = EMAIL_TEMPLATES[key];
  if (!row) return { subject: def.subject, body: def.body, customised: false, enabled: true };
  return { subject: row.subject, body: row.body, customised: row.subject !== def.subject || row.body !== def.body, enabled: row.enabled || REQUIRED_TEMPLATES.includes(key) };
}

function fill(template: string, vars: Record<string, string>, escape: boolean): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const value = vars[key] ?? "";
    return escape ? escapeHtml(value) : value;
  });
}

function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="border-radius:5px;background:#0150c8"><a href="${url}" style="display:inline-block;padding:13px 24px;font-weight:700;font-size:15px;color:#ffffff;text-decoration:none;border-radius:5px">${label}</a></td></tr></table>`;
}

/** Subject, branded HTML and plain text for a template with values filled in. */
export async function renderEmail(source: { subject: string; body: string }, vars: Vars): Promise<{ subject: string; html: string; text: string }> {
  const s = await getSettings("supportEmail", "supportPhone", "fccpcLicence");
  const all: Record<string, string> = { siteName: "DigitMonie", siteUrl: siteUrl(), supportEmail: String(s.supportEmail), name: "there" };
  for (const [key, value] of Object.entries(vars)) if (value !== null && value !== undefined) all[key] = String(value);

  const subject = fill(source.subject, all, false).replace(/\s+/g, " ").trim();
  const withButtons = fill(source.body, all, true).replace(/^\s*\[\[([^|\]]+)\|([^\]]+)\]\]\s*$/gm, (_, label: string, url: string) => `\n${button(label.trim(), url.trim())}\n`);
  const content = (await marked.parse(withButtons, { gfm: true, breaks: true }))
    // A one-line heading is how codes are shown: make it big, spaced and easy to copy.
    .replace(/<h1>(.*?)<\/h1>/g, '<p style="margin:8px 0 20px;font-size:34px;font-weight:800;letter-spacing:8px;color:#0b1733;font-family:Menlo,Consolas,monospace">$1</p>')
    .replace(/<blockquote>/g, '<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:4px solid #f0ca56;background:#fdf8e7;color:#3b4865">');
  const text = fill(source.body, all, false).replace(/^\s*\[\[([^|\]]+)\|([^\]]+)\]\]\s*$/gm, "$1: $2").replace(/\*\*/g, "").replace(/^#\s*/gm, "");

  const home = siteUrl();
  const contact = [
    s.supportEmail && `<a href="mailto:${escapeHtml(String(s.supportEmail))}" style="color:#ffffff;text-decoration:none">${escapeHtml(String(s.supportEmail))}</a>`,
    s.supportPhone && escapeHtml(String(s.supportPhone)),
  ].filter(Boolean).join("&nbsp;&nbsp;·&nbsp;&nbsp;");
  const licence = s.fccpcLicence ? ` (licence ${escapeHtml(String(s.fccpcLicence))})` : "";

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(subject)}</title>
<style>.email-body p{margin:0 0 16px}.email-body a{color:#0150c8}.email-body ul{margin:0 0 16px;padding-left:20px}
@media (max-width:520px){.email-pad{padding-left:24px!important;padding-right:24px!important}}</style></head>
<body style="margin:0;padding:0;background:#f4f7fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0b1733">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fc;padding:28px 0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e4e9f2">
<tr><td class="email-pad" style="background:#0150c8;padding:28px 40px">
<a href="${home}" style="text-decoration:none"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;padding-right:10px"><table role="presentation" cellpadding="0" cellspacing="0" style="width:30px;height:30px;background:#ffffff;border-radius:7px"><tr><td align="center" style="font-size:16px;line-height:30px;color:#0150c8;font-weight:800">◆</td></tr></table></td>
<td style="vertical-align:middle;font-size:24px;font-weight:800;letter-spacing:-0.5px;color:#ffffff">DigitMonie</td>
</tr></table></a></td></tr>
<tr><td height="5" style="height:5px;line-height:5px;font-size:0;background:#f0ca56">&nbsp;</td></tr>
<tr><td class="email-body email-pad" style="padding:36px 44px 28px;font-size:16px;line-height:1.65;color:#3b4865">
${content}
</td></tr>
<tr><td class="email-pad" style="background:#f4f7fc;padding:16px 44px;font-size:13px;line-height:1.55;color:#6b7794;border-top:1px solid #e4e9f2">
🔒 DigitMonie will never ask for your PIN, password or one-time codes, by email, phone or WhatsApp.
</td></tr>
<tr><td class="email-pad" style="background:#04132f;padding:24px 44px">
<p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#f0ca56">Simple Money. Bigger Possibilities.</p>
${contact ? `<p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#c4cde0">${contact}</p>` : ""}
<p style="margin:0;font-size:12px;line-height:1.6;color:#8a96b3">DigitMonie is licensed by the Federal Competition and Consumer Protection Commission (FCCPC)${licence}.<br>© ${new Date().getFullYear()} DigitMonie · <a href="${home}" style="color:#c4cde0;text-decoration:none">digitmonie.com</a></p>
</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html, text };
}

/* ---------- Delivery ---------- */

type Message = { to: string; subject: string; html: string; text: string };
type Delivery = { ok: boolean; id: string | null; error?: string };

async function deliver(cfg: EmailConfig, m: Message): Promise<Delivery> {
  if (cfg.driver === "smtp") {
    const { host, port, security, user, password } = cfg.smtp;
    const transport = nodemailer.createTransport({ host, port, secure: security === "ssl", requireTLS: security === "tls", auth: { user, pass: password }, connectionTimeout: 15_000 });
    try {
      const info = await transport.sendMail({ from: cfg.from, to: m.to, subject: m.subject, html: m.html, text: m.text, replyTo: cfg.replyTo || undefined });
      return { ok: true, id: info.messageId ?? null };
    } catch (error) {
      return { ok: false, id: null, error: error instanceof Error ? error.message : String(error) };
    } finally {
      transport.close();
    }
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: cfg.from, to: [m.to], subject: m.subject, html: m.html, text: m.text, reply_to: cfg.replyTo || undefined }),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    return res.ok ? { ok: true, id: data.id ?? null } : { ok: false, id: null, error: data.message ?? `Resend responded ${res.status}` };
  } catch (error) {
    return { ok: false, id: null, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Sends a templated email through the method chosen in Settings (Resend or SMTP). Never throws:
 * every attempt goes in the email log. With "log only" or missing credentials it's just logged.
 * Switched-off templates are logged as skipped. Codes are masked in the stored copy.
 */
export async function sendTemplate(to: string, key: TemplateKey, vars: Vars): Promise<{ sent: boolean }> {
  const template = await getTemplate(key);
  const message = { to, ...(await renderEmail(template, vars)) };
  const db = await getDb();
  const mask = (html: string) => (vars.code ? html.split(String(vars.code)).join("••••••") : html);
  if (!template.enabled) {
    await db.insert(emailLog).values({ to, template: key, subject: mask(message.subject), html: mask(message.html), status: "skipped", error: "Template switched off in Settings" });
    return { sent: false };
  }
  const cfg = await emailConfig();
  let status: "sent" | "failed" | "logged" = "logged";
  let result: Delivery | null = null;
  if (cfg.ready) {
    result = await deliver(cfg, message);
    status = result.ok ? "sent" : "failed";
    if (!result.ok) console.error(`[email] ${key} to ${to} failed:`, result.error);
  } else {
    console.info(`[email:${key}] to ${to}: ${message.subject}\n${message.text}`);
  }
  await db.insert(emailLog).values({ to, template: key, subject: mask(message.subject), html: mask(message.html), status, error: result?.error ?? null, providerId: result?.id ?? null });
  return { sent: status === "sent" };
}

/** Sample values for previews and test sends. */
export function sampleVars(key: TemplateKey): Vars {
  return { ...COMMON_VARIABLES, ...EMAIL_TEMPLATES[key].variables };
}

export async function otpChannel(): Promise<"email" | "sms" | "both"> {
  const v = await getSetting("otpChannel");
  return v === "sms" || v === "both" ? v : "email";
}
