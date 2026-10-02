import "server-only";
import { and, count, gte, inArray, lt, min } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/db";
import { loginAttempts } from "@/db/schema";

const WINDOW_MS = 15 * 60 * 1000;
/** Failures allowed per address+subject pair, and per address overall, within the window. */
const MAX_PER_SUBJECT = 5;
const MAX_PER_ADDRESS = 30;

export async function clientAddress(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

async function keys(subject: string, scope: string) {
  const address = await clientAddress();
  return { address: `${scope}|ip:${address}`, subject: `${scope}|ip:${address}|${subject.toLowerCase()}` };
}

/** Minutes to wait if blocked, otherwise null. `subject` is the email, phone or user id being tried. */
export async function blockedFor(subject: string, scope: string): Promise<number | null> {
  const k = await keys(subject, scope);
  const since = new Date(Date.now() - WINDOW_MS);
  const rows = await (await getDb())
    .select({ key: loginAttempts.key, n: count(), oldest: min(loginAttempts.createdAt) })
    .from(loginAttempts)
    .where(and(inArray(loginAttempts.key, [k.address, k.subject]), gte(loginAttempts.createdAt, since)))
    .groupBy(loginAttempts.key);
  const hit = (key: string, max: number) => rows.find((r) => r.key === key && r.n >= max);
  const blocked = hit(k.subject, MAX_PER_SUBJECT) ?? hit(k.address, MAX_PER_ADDRESS);
  if (!blocked) return null;
  const oldest = blocked.oldest ? new Date(blocked.oldest).getTime() : Date.now();
  return Math.max(1, Math.ceil((oldest + WINDOW_MS - Date.now()) / 60000));
}

export async function recordFailure(subject: string, scope: string): Promise<void> {
  const k = await keys(subject, scope);
  const db = await getDb();
  await db.insert(loginAttempts).values([{ key: k.address }, { key: k.subject }]);
  await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));
}

export async function clearFailures(subject: string, scope: string): Promise<void> {
  const k = await keys(subject, scope);
  await (await getDb()).delete(loginAttempts).where(inArray(loginAttempts.key, [k.subject]));
}
