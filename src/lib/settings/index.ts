import "server-only";
import { inArray } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { decryptSecret, encryptSecret } from "@/lib/secrets";
import { FIELDS, SECTIONS, type Field } from "./definitions";

type Value = string | number | boolean;

const loadSaved = cache(async (): Promise<Map<string, Value>> => {
  const rows = await (await getDb()).select().from(settings);
  return new Map(rows.map((r) => [r.key, r.value]));
});

function fromEnv(field: Field): Value | undefined {
  const raw = field.env ? process.env[field.env] : undefined;
  if (raw === undefined || raw === "") return undefined;
  if (field.type === "boolean") return raw === "true";
  if (["number", "percent", "naira"].includes(field.type)) return Number(raw);
  return raw;
}

function fallback(field: Field): Value {
  return process.env.NODE_ENV !== "production" && field.devDefault !== undefined ? field.devDefault : field.default;
}

/** A setting's value: saved in Console → Settings, else its environment variable, else the default. Secrets come back decrypted. */
export async function getSetting<T extends Value = string>(key: string): Promise<T> {
  const field = FIELDS.get(key);
  if (!field) throw new Error(`Unknown setting ${key}`);
  const saved = (await loadSaved()).get(key);
  if (saved !== undefined && saved !== "") return (field.type === "secret" ? decryptSecret(String(saved)) : saved) as T;
  return (fromEnv(field) ?? fallback(field)) as T;
}

export async function getSettings<K extends string>(...keys: K[]): Promise<Record<K, Value>> {
  return Object.fromEntries(await Promise.all(keys.map(async (k) => [k, await getSetting(k)]))) as Record<K, Value>;
}

export type FieldState = { value: Value; source: "saved" | "env" | "default"; secretHint?: string };

/** What the settings page shows. Secrets are never sent in full, only whether one is set and its last 4 characters. */
export async function describeSection(sectionId: string): Promise<Record<string, FieldState>> {
  const section = SECTIONS.find((s) => s.id === sectionId);
  if (!section) return {};
  const saved = await loadSaved();
  const out: Record<string, FieldState> = {};
  for (const field of section.fields) {
    const stored = saved.get(field.key);
    const env = fromEnv(field);
    const source = stored !== undefined && stored !== "" ? "saved" : env !== undefined ? "env" : "default";
    if (field.type === "secret") {
      const plain = source === "saved" ? decryptSecret(String(stored)) : source === "env" ? String(env) : "";
      out[field.key] = { value: "", source, secretHint: plain ? `••••${plain.slice(-4)}` : undefined };
    } else {
      out[field.key] = { value: source === "saved" ? stored! : source === "env" ? env! : fallback(field), source };
    }
  }
  return out;
}

export type SaveResult = { ok: true; changed: string[] } | { ok: false; error: string };

/**
 * Saves one section from a form. Blank secret fields keep the current secret; tick "clear" to remove it.
 * Every change is audited (secret values never are).
 */
export async function saveSection(sectionId: string, fd: FormData, actorId: number): Promise<SaveResult> {
  const section = SECTIONS.find((s) => s.id === sectionId);
  if (!section) return { ok: false, error: "Unknown settings section." };
  const db = await getDb();
  const saved = await loadSaved();
  const changed: string[] = [];
  const updates: { key: string; value: Value }[] = [];
  const removals: string[] = [];

  for (const field of section.fields) {
    const raw = String(fd.get(field.key) ?? "").trim();
    let value: Value;
    if (field.type === "secret") {
      if (fd.get(`${field.key}__clear`) === "on") {
        if (saved.has(field.key)) { removals.push(field.key); changed.push(`${field.label} (removed)`); }
        continue;
      }
      if (!raw) continue;
      updates.push({ key: field.key, value: encryptSecret(raw) });
      changed.push(`${field.label} (new value)`);
      continue;
    }
    if (field.type === "boolean") value = fd.get(field.key) === "on";
    else if (["number", "percent", "naira"].includes(field.type)) {
      const n = Number(raw.replace(/[₦,%\s]/g, ""));
      if (raw === "" || !Number.isFinite(n)) return { ok: false, error: `${field.label}: enter a number.` };
      if ((field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max)) return { ok: false, error: `${field.label} must be between ${field.min} and ${field.max}.` };
      if (n < 0) return { ok: false, error: `${field.label} can't be negative.` };
      value = n;
    } else if (field.type === "select") {
      if (!field.options?.some((o) => o.value === raw)) return { ok: false, error: `${field.label}: choose an option.` };
      value = raw;
    } else value = raw.slice(0, 300);

    const current = await getSetting(field.key);
    if (current === value) continue;
    updates.push({ key: field.key, value });
    changed.push(`${field.label}: ${String(current)} → ${String(value)}`);
  }

  if (sectionId === "email") {
    const isEmail = (v: string) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    for (const k of ["emailFromAddress", "emailReplyTo"]) if (!isEmail(String(fd.get(k) ?? "").trim())) return { ok: false, error: `${FIELDS.get(k)!.label}: enter a valid email address, or leave it empty.` };
    const key = String(fd.get("resendApiKey") ?? "").trim();
    if (key && !key.startsWith("re_")) return { ok: false, error: "Resend API keys start with re_." };
    if (fd.get("emailDriver") === "smtp") {
      const hasPassword = String(fd.get("smtpPassword") ?? "").trim() || saved.get("smtpPassword");
      if (!String(fd.get("smtpHost") ?? "").trim() || !String(fd.get("smtpUser") ?? "").trim() || !hasPassword) return { ok: false, error: "Add the SMTP host, username and password to send with your own mail server." };
    }
  }

  if (sectionId === "kyc") {
    const face = Number(fd.get("faceAutoApprove")), review = Number(fd.get("faceReview"));
    if (review > face) return { ok: false, error: "The rejection threshold must be lower than the automatic-pass threshold." };
  }

  for (const u of updates) {
    await db.insert(settings).values({ key: u.key, value: u.value, updatedById: actorId }).onConflictDoUpdate({ target: settings.key, set: { value: u.value, updatedById: actorId, updatedAt: new Date() } });
  }
  if (removals.length) await db.delete(settings).where(inArray(settings.key, removals));
  if (changed.length) {
    await logAudit({ actorId, action: "settings.updated", summary: `changed ${section.title} settings: ${changed.join("; ")}`, target: { type: "settings", id: section.id } });
  }
  return { ok: true, changed };
}
