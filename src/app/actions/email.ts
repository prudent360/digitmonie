"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { emailTemplates } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { emailConfig, sampleVars, sendTemplate } from "@/lib/email";
import { EMAIL_TEMPLATES, REQUIRED_TEMPLATES, isTemplateKey } from "@/lib/email-templates";
import type { FormState } from "./auth";

const paths = (key?: string) => {
  revalidatePath("/console/settings");
  if (key) revalidatePath(`/console/settings/emails/${key}`);
};

export async function saveTemplate(key: string, _: FormState, fd: FormData): Promise<FormState> {
  const admin = await requirePermission("settings.manage");
  if (!isTemplateKey(key)) return { error: "Unknown template." };
  const subject = String(fd.get("subject") ?? "").trim().slice(0, 200);
  const body = String(fd.get("body") ?? "").trim().slice(0, 20_000);
  if (!subject || !body) return { error: "The subject and body are both required." };
  if ((key === "verification_code" || key === "password_reset_code") && !/\{\{\s*code\s*\}\}/.test(body)) return { error: "This email must include {{code}}, or customers won't get their code." };
  if (key === "staff_invite" && !/\{\{\s*inviteUrl\s*\}\}/.test(body)) return { error: "This email must include {{inviteUrl}}, or the person can't accept the invitation." };
  await (await getDb()).insert(emailTemplates).values({ key, subject, body, updatedById: admin.id })
    .onConflictDoUpdate({ target: emailTemplates.key, set: { subject, body, updatedById: admin.id, updatedAt: new Date() } });
  await logAudit({ actorId: admin.id, action: "email.template_saved", summary: `edited the "${EMAIL_TEMPLATES[key].name}" email`, target: { type: "email_template", id: key } });
  paths(key);
  return { notice: "Template saved. The preview shows the new version." };
}

export async function setTemplateEnabled(key: string, enabled: boolean): Promise<FormState> {
  const admin = await requirePermission("settings.manage");
  if (!isTemplateKey(key) || REQUIRED_TEMPLATES.includes(key)) return { error: "Security emails can't be switched off." };
  const def = EMAIL_TEMPLATES[key];
  await (await getDb()).insert(emailTemplates).values({ key, subject: def.subject, body: def.body, enabled, updatedById: admin.id })
    .onConflictDoUpdate({ target: emailTemplates.key, set: { enabled, updatedById: admin.id, updatedAt: new Date() } });
  await logAudit({ actorId: admin.id, action: "email.template_toggled", summary: `turned the "${def.name}" email ${enabled ? "on" : "off"}`, target: { type: "email_template", id: key } });
  paths();
  return { notice: enabled ? "Turned on." : "Turned off." };
}

export async function resetTemplate(key: string): Promise<FormState> {
  const admin = await requirePermission("settings.manage");
  if (!isTemplateKey(key)) return { error: "Unknown template." };
  const def = EMAIL_TEMPLATES[key];
  // Keep the on/off choice; only the wording goes back to the original.
  await (await getDb()).update(emailTemplates).set({ subject: def.subject, body: def.body, updatedById: admin.id, updatedAt: new Date() }).where(eq(emailTemplates.key, key));
  await logAudit({ actorId: admin.id, action: "email.template_reset", summary: `restored the original "${def.name}" email`, target: { type: "email_template", id: key } });
  paths(key);
  return { notice: "Original wording restored." };
}

export async function sendTestTemplate(key: string): Promise<FormState> {
  const admin = await requirePermission("settings.manage");
  if (!isTemplateKey(key)) return { error: "Unknown template." };
  const { sent } = await sendTemplate(admin.email, key, { ...sampleVars(key), name: admin.firstName });
  revalidatePath("/console/settings");
  return sent ? { notice: `Sent to ${admin.email}.` } : { notice: `Not delivered (${(await emailConfig()).ready ? "check the email log" : "email isn't set up yet, so it was only logged"}).` };
}

export async function sendTestEmailNow(): Promise<FormState> {
  return sendTestTemplate("verification_code");
}
