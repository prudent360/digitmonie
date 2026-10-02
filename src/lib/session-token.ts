import { jwtVerify, SignJWT } from "jose";
import type { UserKind } from "@/db/schema";

/** Session and step-up token helpers. Safe to import from proxy.ts (no Node-only APIs). */
export const SESSION_COOKIE = "dm_session";
/** Carries a half-finished sign-in (phone verification, 2FA, password reset) between steps. */
export const PENDING_COOKIE = "dm_pending";

/** Fintech sessions are short: staff 8 hours, customers 12. */
export const SESSION_TTL_SECONDS: Record<UserKind, number> = { staff: 8 * 60 * 60, customer: 12 * 60 * 60 };
export const PENDING_TTL_SECONDS = 15 * 60;

export type SessionPayload = { uid: number; kind: UserKind; v: number };
export type PendingStep = "verify_phone" | "two_factor" | "two_factor_setup" | "reset_password";
export type PendingPayload = { uid: number; step: PendingStep };

export function sessionSecretProblem(): string | null {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) return "SESSION_SECRET is not set.";
  if (secret.length < 32) return `SESSION_SECRET is only ${secret.length} characters; it needs at least 32.`;
  return null;
}

function secretKey(): Uint8Array {
  const problem = sessionSecretProblem();
  if (problem) throw new Error(`${problem} Generate one with: openssl rand -base64 32`);
  return new TextEncoder().encode(process.env.SESSION_SECRET!.trim());
}

async function sign(payload: Record<string, unknown>, ttlSeconds: number, audience: string) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setAudience(audience).setIssuedAt().setExpirationTime(`${ttlSeconds}s`).sign(secretKey());
}

async function verify(token: string | undefined, audience: string) {
  if (!token) return null;
  try {
    return (await jwtVerify(token, secretKey(), { algorithms: ["HS256"], audience })).payload;
  } catch {
    return null;
  }
}

export const signSession = (p: SessionPayload) => sign(p, SESSION_TTL_SECONDS[p.kind], "session");
export const signPending = (p: PendingPayload) => sign(p, PENDING_TTL_SECONDS, "pending");

export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  const p = await verify(token, "session");
  if (!p || typeof p.uid !== "number" || typeof p.v !== "number" || (p.kind !== "staff" && p.kind !== "customer")) return null;
  return { uid: p.uid, kind: p.kind, v: p.v };
}

export async function verifyPendingToken(token: string | undefined): Promise<PendingPayload | null> {
  const p = await verify(token, "pending");
  if (!p || typeof p.uid !== "number" || typeof p.step !== "string") return null;
  return { uid: p.uid, step: p.step as PendingStep };
}
