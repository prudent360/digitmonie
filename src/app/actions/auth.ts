"use server";

import bcrypt from "bcryptjs";
import { eq, or, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import {
  clearPending, continueSignIn, destroySession, finishSignIn, fullName, getCurrentUser, getPending, loadUser, rememberNext, setPending, type CurrentUser,
} from "@/lib/auth";
import { encryptSecret, decryptSecret } from "@/lib/secrets";
import { issueOtp, verifyOtp } from "@/lib/otp";
import { CUSTOMER_ROLE } from "@/lib/permissions";
import { normalizeNgPhone } from "@/lib/phone";
import { passwordProblem, pinProblem } from "@/lib/password";
import { blockedFor, clearFailures, recordFailure } from "@/lib/rate-limit";
import { consumeInviteToken, peekInviteToken } from "@/lib/tokens";
import { sendTemplate } from "@/lib/email";
import { siteUrl } from "@/lib/messaging";
import { getSetting } from "@/lib/settings";
import { generateTotpSecret, verifyTotp } from "@/lib/totp";

export type FormState = { error?: string; notice?: string; fields?: Record<string, string> } | undefined;

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const tooMany = (minutes: number): FormState => ({ error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` });

async function findByIdentifier(identifier: string): Promise<CurrentUser | null> {
  const email = identifier.includes("@") ? identifier.toLowerCase() : null;
  const phone = email ? null : normalizeNgPhone(identifier);
  if (!email && !phone) return null;
  const [row] = await (await getDb()).select({ id: users.id }).from(users)
    .where(email ? eq(users.email, email) : eq(users.phone, phone!));
  return row ? loadUser(row.id) : null;
}

/** Staff need an authenticator secret ready before the setup screen shows its QR code. */
async function prepareTwoFactorSetup(user: CurrentUser) {
  if (user.role.kind === "staff" && !user.totpEnabledAt) {
    await (await getDb()).update(users).set({ totpSecret: encryptSecret(generateTotpSecret()) }).where(eq(users.id, user.id));
  }
}

/* ---------- Sign in ---------- */

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const identifier = str(fd, "identifier");
  const password = String(fd.get("password") ?? "");
  const fields = { identifier };
  if (!identifier || !password) return { error: "Enter your phone number or email and your password.", fields };

  const wait = await blockedFor(identifier, "login");
  if (wait) return { ...tooMany(wait), fields };

  const user = await findByIdentifier(identifier);
  const ok = user?.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) {
    await recordFailure(identifier, "login");
    return { error: "That phone number, email or password isn't right.", fields };
  }
  if (user.status === "closed") return { error: "This account is closed. Contact support if you think this is a mistake.", fields };
  if (user.status === "pending") return { error: "Finish setting up your account from the invitation email first.", fields };

  await clearFailures(identifier, "login");
  if (user.role.kind === "staff") {
    await logAudit({ actorId: user.id, action: "auth.password_ok", summary: "entered the correct password", target: { type: "user", id: user.id } });
  }
  await prepareTwoFactorSetup(user);
  await rememberNext(fd.get("next"));
  redirect(await continueSignIn(user));
}

export async function signOut() {
  await destroySession();
  await clearPending();
  redirect("/login");
}

/* ---------- Customer sign-up ---------- */

const registerSchema = z.object({
  firstName: z.string().trim().min(2, "Enter your first name.").max(60),
  lastName: z.string().trim().min(2, "Enter your last name.").max(60),
  phone: z.string().transform((v, ctx) => {
    const phone = normalizeNgPhone(v);
    if (!phone) ctx.addIssue({ code: "custom", message: "Enter a valid Nigerian mobile number." });
    return phone ?? "";
  }),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string(),
  referral: z.string().trim().max(40).optional(),
});

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const raw = Object.fromEntries(["firstName", "lastName", "phone", "email", "password", "referral"].map((k) => [k, String(fd.get(k) ?? "")]));
  const fields = { firstName: raw.firstName, lastName: raw.lastName, phone: raw.phone, email: raw.email, referral: raw.referral };
  if (await getSetting<boolean>("pauseSignups")) return { error: "We've paused new sign-ups for a short while. Please try again soon.", fields };
  if (fd.get("terms") !== "on") return { error: "Please accept the Terms and Privacy Policy to continue.", fields };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };
  const problem = passwordProblem(parsed.data.password);
  if (problem) return { error: problem, fields };

  const db = await getDb();
  const [existing] = await db.select({ phone: users.phone, email: users.email }).from(users)
    .where(or(eq(users.phone, parsed.data.phone), eq(sql`lower(${users.email})`, parsed.data.email)));
  if (existing) {
    return { error: existing.phone === parsed.data.phone ? "That phone number already has an account. Log in instead." : "That email already has an account. Log in instead.", fields };
  }

  const [created] = await db.insert(users).values({
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName,
    phone: parsed.data.phone,
    email: parsed.data.email,
    passwordHash: await bcrypt.hash(parsed.data.password, 12),
    roleKey: CUSTOMER_ROLE,
  }).returning({ id: users.id });

  const user = (await loadUser(created.id))!;
  redirect(await continueSignIn(user));
}

/* ---------- Confirming a new account (code by email or SMS) ---------- */

export async function verifyCode(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getPending("verify_contact");
  if (!user) redirect("/login");
  const result = await verifyOtp(user.id, ["verify_email", "verify_phone"], str(fd, "code"));
  if (!result.ok) return { error: result.error };
  const now = new Date();
  const confirmed = result.purpose === "verify_email" ? { emailVerifiedAt: now } : { phoneVerifiedAt: now };
  await (await getDb()).update(users).set(confirmed).where(eq(users.id, user.id));
  await sendTemplate(user.email, "welcome", { name: user.firstName, dashboardUrl: `${siteUrl()}/dashboard/verify` });
  redirect(await finishSignIn({ ...user, ...confirmed }));
}

export async function resendCode(): Promise<FormState> {
  const user = await getPending("verify_contact");
  if (!user) redirect("/login");
  const result = await issueOtp(user, "verify");
  return result.ok ? { notice: `We've sent a new code to ${result.sentTo}.` } : { error: result.error };
}

/* ---------- Transaction PIN (first time) ---------- */

export async function createPin(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user || user.role.kind !== "customer") redirect("/login");
  if (user.pinHash) redirect("/dashboard");
  const pin = str(fd, "pin");
  const problem = pinProblem(pin);
  if (problem) return { error: problem };
  if (pin !== str(fd, "confirm")) return { error: "The two PINs don't match." };
  await (await getDb()).update(users).set({ pinHash: await bcrypt.hash(pin, 12) }).where(eq(users.id, user.id));
  await logAudit({ actorId: user.id, action: "account.pin_created", summary: "created a transaction PIN", target: { type: "user", id: user.id } });
  redirect("/dashboard");
}

/* ---------- Staff two-factor ---------- */

export async function verifyTwoFactor(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getPending("two_factor");
  if (!user) redirect("/login");
  const wait = await blockedFor(String(user.id), "two_factor");
  if (wait) return tooMany(wait);
  if (!verifyTotp(decryptSecret(user.totpSecret), str(fd, "code"))) {
    await recordFailure(String(user.id), "two_factor");
    await logAudit({ actorId: user.id, action: "auth.two_factor_failed", summary: "entered a wrong authenticator code", target: { type: "user", id: user.id } });
    return { error: "That code isn't right. Check the time on your phone and try the newest code." };
  }
  await clearFailures(String(user.id), "two_factor");
  await logAudit({ actorId: user.id, action: "auth.signed_in", summary: "signed in to the console", target: { type: "user", id: user.id } });
  redirect(await finishSignIn(user));
}

export async function confirmTwoFactorSetup(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getPending("two_factor_setup");
  if (!user) redirect("/login");
  if (!verifyTotp(decryptSecret(user.totpSecret), str(fd, "code"))) {
    return { error: "That code doesn't match. Scan the QR code again and enter the 6 digits your app shows now." };
  }
  await (await getDb()).update(users).set({ totpEnabledAt: new Date() }).where(eq(users.id, user.id));
  await logAudit({ actorId: user.id, action: "auth.two_factor_enabled", summary: "set up two-factor sign-in", target: { type: "user", id: user.id } });
  redirect(await finishSignIn(user));
}

/* ---------- Forgotten password ---------- */

export async function requestPasswordReset(_: FormState, fd: FormData): Promise<FormState> {
  const identifier = str(fd, "identifier");
  const fields = { identifier };
  const wait = await blockedFor(identifier, "reset");
  if (wait) return { ...tooMany(wait), fields };
  const user = await findByIdentifier(identifier);
  if (!user || user.status === "closed" || user.status === "pending") {
    await recordFailure(identifier, "reset");
    return { error: "We couldn't find an account with that phone number or email.", fields };
  }
  const result = await issueOtp(user, "reset_password");
  if (!result.ok) return { error: result.error, fields };
  await setPending(user.id, "reset_password");
  redirect("/reset-password");
}

export async function resetPassword(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getPending("reset_password");
  if (!user) redirect("/forgot-password");
  const password = String(fd.get("password") ?? "");
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  if (password !== String(fd.get("confirm") ?? "")) return { error: "The two passwords don't match." };
  const result = await verifyOtp(user.id, "reset_password", str(fd, "code"));
  if (!result.ok) return { error: result.error };

  await (await getDb()).update(users)
    .set({ passwordHash: await bcrypt.hash(password, 12), sessionVersion: user.sessionVersion + 1 })
    .where(eq(users.id, user.id));
  await logAudit({ actorId: user.id, action: "auth.password_reset", summary: "reset their password with a code", target: { type: "user", id: user.id } });
  await clearPending();
  redirect("/login?reset=1");
}

export async function resendResetCode(): Promise<FormState> {
  const user = await getPending("reset_password");
  if (!user) redirect("/forgot-password");
  const result = await issueOtp(user, "reset_password");
  return result.ok ? { notice: "We've sent a new code." } : { error: result.error };
}

/* ---------- Staff invitation ---------- */

export async function acceptInvite(token: string, _: FormState, fd: FormData): Promise<FormState> {
  const userId = await peekInviteToken(token);
  if (!userId) return { error: "This invitation has expired or was already used. Ask an administrator for a new one." };
  const password = String(fd.get("password") ?? "");
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  if (password !== String(fd.get("confirm") ?? "")) return { error: "The two passwords don't match." };
  if (!(await consumeInviteToken(token))) return { error: "This invitation has expired or was already used." };

  await (await getDb()).update(users).set({ passwordHash: await bcrypt.hash(password, 12), status: "active", emailVerifiedAt: new Date() }).where(eq(users.id, userId));
  const user = (await loadUser(userId))!;
  await logAudit({ actorId: user.id, action: "staff.invite_accepted", summary: `accepted their invitation (${fullName(user)})`, target: { type: "user", id: user.id } });
  await prepareTwoFactorSetup(user);
  redirect(await continueSignIn(user));
}
