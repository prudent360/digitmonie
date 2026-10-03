import "server-only";
import { eq } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db";
import { roles, users, type Role, type User, type UserKind } from "@/db/schema";
import { ADMIN_ROLE, type Permission } from "./permissions";
import { issueOtp } from "./otp";
import { getSetting } from "./settings";
import {
  DEFAULT_IDLE_MINUTES, PENDING_COOKIE, PENDING_TTL_SECONDS, SESSION_COOKIE, SESSION_TTL_SECONDS, hardExpiry,
  signPending, signReturn, signSession, verifyPendingToken, verifyReturnToken, verifySessionToken, type PendingStep, type SessionPayload,
} from "./session-token";

export type CurrentUser = User & { role: Role };

const cookieBase = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

/** Statuses that may sign in. Frozen and restricted customers can still see their account. */
const CAN_SIGN_IN = new Set(["active", "restricted", "frozen"]);

export async function loadUser(id: number): Promise<CurrentUser | null> {
  const [row] = await (await getDb()).select().from(users).innerJoin(roles, eq(roles.key, users.roleKey)).where(eq(users.id, id));
  return row ? { ...row.users, role: row.roles } : null;
}

/**
 * The signed-in user, re-read from the database on every request so role changes,
 * suspensions and "sign out everywhere" take effect immediately.
 */
const resolveSession = cache(async (): Promise<{ user: CurrentUser; viewer: CurrentUser | null } | null> => {
  const session = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await loadUser(session.uid);
  if (!user || !CAN_SIGN_IN.has(user.status) || user.sessionVersion !== session.v || user.role.kind !== session.kind) return null;
  if (!session.imp) return { user, viewer: null };
  // Viewing as a customer only lasts while the staff member still has the right to do it.
  const viewer = await loadUser(session.imp);
  if (!viewer || viewer.status !== "active" || viewer.role.kind !== "staff" || viewer.sessionVersion !== session.iv || !can(viewer, "users.view_as")) return null;
  return { user, viewer };
});

export async function getCurrentUser(): Promise<CurrentUser | null> {
  return (await resolveSession())?.user ?? null;
}

/** The staff member viewing this customer's account read-only, if that's what this session is. */
export async function viewingAs(): Promise<CurrentUser | null> {
  return (await resolveSession())?.viewer ?? null;
}

/** True inside a server action (a change), as opposed to rendering a page. */
async function isServerAction(): Promise<boolean> {
  return (await headers()).has("next-action");
}

/** Staff viewing a customer's account can look but never change anything. Sends them back to the page they were on. */
async function blockChangesWhileViewing() {
  if (!(await viewingAs()) || !(await isServerAction())) return;
  const referer = (await headers()).get("referer");
  let path = "/dashboard";
  try {
    const url = referer ? new URL(referer) : null;
    if (url && url.pathname.startsWith("/dashboard")) path = url.pathname;
  } catch { /* keep the default */ }
  redirect(`${path}?view-only=1`);
}

export function can(user: Pick<CurrentUser, "role">, permission: Permission): boolean {
  if (user.role.kind !== "staff") return false;
  return user.role.key === ADMIN_ROLE || user.role.permissions.includes(permission);
}

export const fullName = (u: Pick<User, "firstName" | "lastName">) => `${u.firstName} ${u.lastName}`.trim();

export async function requireCustomer(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role.kind !== "customer") redirect("/console");
  await blockChangesWhileViewing();
  return user;
}

export async function requireStaff(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role.kind !== "staff") redirect("/dashboard");
  return user;
}

/** Call at the top of every console page and console server action. */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireStaff();
  if (!can(user, "console.access") || !can(user, permission)) redirect("/console?denied=1");
  return user;
}

/** Where the browser should go after signing in again: the page they were on, if it's one of ours. */
const NEXT_COOKIE = "dm_next";

async function idleSeconds(kind: UserKind): Promise<number> {
  const minutes = Number(await getSetting<number>(kind === "staff" ? "staffIdleMinutes" : "customerIdleMinutes"));
  return Math.round((Number.isFinite(minutes) && minutes >= 5 ? minutes : DEFAULT_IDLE_MINUTES[kind]) * 60);
}

/** Writes a session cookie that stops working after the idle limit (or the hard limit, if sooner). */
async function writeSession(payload: SessionPayload) {
  const { token, exp } = await signSession(payload, await idleSeconds(payload.kind));
  // The browser keeps the cookie until the hard limit; the token inside enforces the idle limit.
  const maxAge = Math.max(0, hardExpiry(payload) - Math.floor(Date.now() / 1000));
  (await cookies()).set(SESSION_COOKIE, token, { ...cookieBase, maxAge });
  return { expiresAt: exp, hardExpiresAt: hardExpiry(payload) };
}

async function createSession(user: Pick<CurrentUser, "id" | "sessionVersion" | "role">) {
  await writeSession({ uid: user.id, kind: user.role.kind, v: user.sessionVersion, st: Math.floor(Date.now() / 1000) });
  (await cookies()).delete(PENDING_COOKIE);
}

export type SessionTiming = { /** Epoch seconds. */ expiresAt: number; hardExpiresAt: number };

/** When the current session ends if the user does nothing more, without extending it. */
export async function sessionTiming(): Promise<SessionTiming | null> {
  const session = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  return session ? { expiresAt: session.exp, hardExpiresAt: hardExpiry(session) } : null;
}

/** The user is active: restart the idle clock (never past the hard limit). Null if the session has ended. */
export async function extendSession(): Promise<SessionTiming | null> {
  const session = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session || !(await getCurrentUser())) return null;
  return writeSession({ uid: session.uid, kind: session.kind, v: session.v, st: session.st, imp: session.imp, iv: session.iv });
}

/* ---------- Viewing a customer's account (read-only) ---------- */

/** Holds the staff member's own session while they view a customer's account. */
const RETURN_COOKIE = "dm_return";

/** Swaps the staff session for a read-only view of the customer's account, keeping the staff session to return to. */
export async function startViewingAs(staff: CurrentUser, customer: CurrentUser) {
  const jar = await cookies();
  const own = await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!own || own.uid !== staff.id || own.imp) throw new Error("No staff session to return to.");
  jar.set(RETURN_COOKIE, await signReturn(own), { ...cookieBase, maxAge: SESSION_TTL_SECONDS.staff });
  await writeSession({ uid: customer.id, kind: "customer", v: customer.sessionVersion, st: Math.floor(Date.now() / 1000), imp: staff.id, iv: staff.sessionVersion });
}

/** Ends a view: restores the staff session if it's still valid. Returns the staff member, or null if they must sign in again. */
export async function stopViewingAs(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const session = await verifyReturnToken(jar.get(RETURN_COOKIE)?.value);
  jar.delete(RETURN_COOKIE);
  const staff = session ? await loadUser(session.uid) : null;
  if (!session || !staff || staff.status !== "active" || staff.role.kind !== "staff" || staff.sessionVersion !== session.v) {
    jar.delete(SESSION_COOKIE);
    return null;
  }
  // Back to their own session, same sign-in time (so the 8-hour limit still applies), idle clock restarted.
  await writeSession(session);
  return staff;
}

/** A path inside the signed-in app, or null. Rejects anything that could leave the site. */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return /^\/(dashboard|console)(\/|\?|$)/.test(value) ? value : null;
}

/** Remembers where to return after the sign-in steps (password, codes, 2FA) are done. */
export async function rememberNext(value: unknown) {
  const next = safeNextPath(value);
  const jar = await cookies();
  if (next) jar.set(NEXT_COOKIE, next, { ...cookieBase, maxAge: PENDING_TTL_SECONDS });
  else jar.delete(NEXT_COOKIE);
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
  (await cookies()).delete(RETURN_COOKIE);
}

/* ---------- Multi-step sign-in ---------- */

export async function setPending(uid: number, step: PendingStep) {
  (await cookies()).set(PENDING_COOKIE, await signPending({ uid, step }), { ...cookieBase, maxAge: PENDING_TTL_SECONDS });
}

/** The user part-way through `step`, or null if there isn't one (or it expired). */
export async function getPending(step: PendingStep): Promise<CurrentUser | null> {
  const pending = await verifyPendingToken((await cookies()).get(PENDING_COOKIE)?.value);
  if (!pending || pending.step !== step) return null;
  const user = await loadUser(pending.uid);
  return user && (CAN_SIGN_IN.has(user.status) || step === "two_factor_setup") ? user : null;
}

export async function clearPending() {
  (await cookies()).delete(PENDING_COOKIE);
}

/** Where a user goes once fully signed in. */
export function homeFor(user: Pick<CurrentUser, "role" | "pinHash">): string {
  if (user.role.kind === "staff") return "/console";
  return user.pinHash ? "/dashboard" : "/onboarding/pin";
}

/** Whether staff must use an authenticator code after their password (Console → Settings → Security). */
export async function staffTwoFactorRequired(): Promise<boolean> {
  return (await getSetting<boolean>("staffTwoFactor")) !== false;
}

/** Called after the password checks out: decides the next step and returns where to go. */
export async function continueSignIn(user: CurrentUser): Promise<string> {
  if (user.role.kind === "staff") {
    if (!(await staffTwoFactorRequired())) return finishSignIn(user);
    if (user.totpEnabledAt) {
      await setPending(user.id, "two_factor");
      return "/login/two-factor";
    }
    await setPending(user.id, "two_factor_setup");
    return "/login/two-factor/setup";
  }
  // Customers must confirm at least one contact (email or phone) before using the account.
  if (!user.emailVerifiedAt && !user.phoneVerifiedAt) {
    await issueOtp(user, "verify");
    await setPending(user.id, "verify_contact");
    return "/verify-code";
  }
  return finishSignIn(user);
}

/** Every check has passed: create the session. */
export async function finishSignIn(user: CurrentUser): Promise<string> {
  await createSession(user);
  await (await getDb()).update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  const jar = await cookies();
  const next = safeNextPath(jar.get(NEXT_COOKIE)?.value);
  jar.delete(NEXT_COOKIE);
  const home = homeFor(user);
  // Only back to the same area (staff to the console, customers to the dashboard), and not past PIN setup.
  return next && home !== "/onboarding/pin" && next.startsWith(home) ? next : home;
}
