import "server-only";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/db";
import { roles, users, type Role, type User, type UserKind } from "@/db/schema";
import { ADMIN_ROLE, type Permission } from "./permissions";
import { issueOtp } from "./otp";
import {
  PENDING_COOKIE, PENDING_TTL_SECONDS, SESSION_COOKIE, SESSION_TTL_SECONDS,
  signPending, signSession, verifyPendingToken, verifySessionToken, type PendingStep,
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
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await loadUser(session.uid);
  if (!user || !CAN_SIGN_IN.has(user.status) || user.sessionVersion !== session.v || user.role.kind !== session.kind) return null;
  return user;
});

export function can(user: Pick<CurrentUser, "role">, permission: Permission): boolean {
  if (user.role.kind !== "staff") return false;
  return user.role.key === ADMIN_ROLE || user.role.permissions.includes(permission);
}

export const fullName = (u: Pick<User, "firstName" | "lastName">) => `${u.firstName} ${u.lastName}`.trim();

export async function requireCustomer(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role.kind !== "customer") redirect("/console");
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

async function createSession(user: Pick<CurrentUser, "id" | "sessionVersion" | "role">) {
  const kind: UserKind = user.role.kind;
  const token = await signSession({ uid: user.id, kind, v: user.sessionVersion });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { ...cookieBase, maxAge: SESSION_TTL_SECONDS[kind] });
  jar.delete(PENDING_COOKIE);
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
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

/** Called after the password checks out: decides the next step and returns where to go. */
export async function continueSignIn(user: CurrentUser): Promise<string> {
  if (user.role.kind === "staff") {
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
  return homeFor(user);
}
