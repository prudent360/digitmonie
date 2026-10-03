import { jwtVerify, SignJWT } from "jose";
import type { UserKind } from "@/db/schema";

/** Session, view-as and step-up token helpers. Safe to import from proxy.ts (no Node-only APIs). */
export const SESSION_COOKIE = "dm_session";
/** Carries a half-finished sign-in (phone verification, 2FA, password reset) between steps. */
export const PENDING_COOKIE = "dm_pending";

/** The hard limit on one sign-in, however active the user is: staff 8 hours, customers 12. */
export const SESSION_TTL_SECONDS: Record<UserKind, number> = { staff: 8 * 60 * 60, customer: 12 * 60 * 60 };
/** Idle limits when nothing is saved in Settings. */
export const DEFAULT_IDLE_MINUTES: Record<UserKind, number> = { staff: 30, customer: 15 };
export const PENDING_TTL_SECONDS = 15 * 60;

/** How long a staff member can view a customer's account before it ends on its own. */
export const VIEW_AS_SECONDS = 30 * 60;

/**
 * `st` is when the user signed in (epoch seconds); the token itself expires after the idle limit.
 * `imp` and `iv` are set while a staff member views a customer's account (read-only): their id and session version.
 */
export type SessionPayload = { uid: number; kind: UserKind; v: number; st: number; imp?: number; iv?: number };
export type SessionInfo = SessionPayload & { /** Epoch seconds when this token stops working. */ exp: number };
export type PendingStep = "verify_contact" | "two_factor" | "two_factor_setup" | "reset_password";
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

async function sign(payload: Record<string, unknown>, expiresAt: number, audience: string) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setAudience(audience).setIssuedAt().setExpirationTime(expiresAt).sign(secretKey());
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

/** When a session must end, whatever happens: sign-in time plus the hard limit. */
export const hardExpiry = (p: Pick<SessionPayload, "kind" | "st" | "imp">) => p.st + (p.imp ? VIEW_AS_SECONDS : SESSION_TTL_SECONDS[p.kind]);

async function verify(token: string | undefined, audience: string) {
  if (!token) return null;
  try {
    return (await jwtVerify(token, secretKey(), { algorithms: ["HS256"], audience })).payload;
  } catch {
    return null;
  }
}

/** A session token that lasts `idleSeconds` from now, but never past the hard limit. Returns the token and its expiry. */
export async function signSession(p: SessionPayload, idleSeconds: number): Promise<{ token: string; exp: number }> {
  const exp = Math.min(nowSeconds() + idleSeconds, hardExpiry(p));
  return { token: await sign(p, exp, "session"), exp };
}
export const signPending = (p: PendingPayload) => sign(p, nowSeconds() + PENDING_TTL_SECONDS, "pending");

export async function verifySessionToken(token: string | undefined): Promise<SessionInfo | null> {
  const p = await verify(token, "session");
  if (!p || typeof p.uid !== "number" || typeof p.v !== "number" || typeof p.exp !== "number" || (p.kind !== "staff" && p.kind !== "customer")) return null;
  // Tokens from before idle timeouts carry no `st`; their issue time stands in for it.
  const st = typeof p.st === "number" ? p.st : typeof p.iat === "number" ? p.iat : 0;
  const imp = typeof p.imp === "number" && typeof p.iv === "number" ? { imp: p.imp, iv: p.iv } : {};
  if (hardExpiry({ kind: p.kind, st, ...imp }) <= nowSeconds()) return null;
  return { uid: p.uid, kind: p.kind, v: p.v, st, exp: p.exp, ...imp };
}

export async function verifyPendingToken(token: string | undefined): Promise<PendingPayload | null> {
  const p = await verify(token, "pending");
  if (!p || typeof p.uid !== "number" || typeof p.step !== "string") return null;
  return { uid: p.uid, step: p.step as PendingStep };
}

/** Lets a staff member return to the console after viewing a customer's account, until their own hard limit. */
export const signReturn = (p: SessionPayload) => sign({ uid: p.uid, kind: p.kind, v: p.v, st: p.st }, hardExpiry(p), "return");

export async function verifyReturnToken(token: string | undefined): Promise<SessionPayload | null> {
  const p = await verify(token, "return");
  if (!p || typeof p.uid !== "number" || typeof p.v !== "number" || typeof p.st !== "number" || p.kind !== "staff") return null;
  return { uid: p.uid, kind: "staff", v: p.v, st: p.st };
}
