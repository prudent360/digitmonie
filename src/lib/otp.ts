import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, count, desc, eq, gt, gte, inArray, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { otpCodes, type OtpPurpose, type User } from "@/db/schema";
import { emailConfigured, otpChannel, sendTemplate } from "./email";
import { sendSms, smsConfigured } from "./messaging";
import { maskNgPhone } from "./phone";

const TTL_MS = 10 * 60 * 1000;
const RESEND_AFTER_MS = 60 * 1000;
const MAX_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;
/** Local development only: lets the verify screen show the code when no SMS provider is set. */
export const DEV_OTP_COOKIE = "dm_dev_otp";

const hash = (code: string) => createHmac("sha256", `otp:${process.env.SESSION_SECRET ?? ""}`).update(code).digest("hex");

const SMS_TEXT = {
  verify: (code: string) => `Your DigitMonie verification code is ${code}. It expires in 10 minutes. Never share it with anyone.`,
  reset_password: (code: string) => `Your DigitMonie password reset code is ${code}. It expires in 10 minutes. If you didn't ask for this, ignore it.`,
};

export type IssueResult = { ok: true; sentTo: string } | { ok: false; error: string; retryInSeconds?: number };

const maskEmail = (email: string) => email.replace(/^(.)(.*)(.@.*)$/, (_, a: string, mid: string, b: string) => `${a}${"•".repeat(Math.min(6, mid.length))}${b}`);

/** Where codes go for this user, following Settings → Email → "Send one-time codes by". */
export async function codeDestinations(user: Pick<User, "phone" | "email">): Promise<{ email: boolean; sms: boolean; label: string }> {
  const channel = await otpChannel();
  // Safety net: if codes should go by email but email isn't set up in production, use SMS too
  // rather than leave customers without a code.
  const emailBroken = channel === "email" && process.env.NODE_ENV === "production" && !(await emailConfigured());
  const sms = (channel === "sms" || channel === "both" || emailBroken) && Boolean(user.phone);
  const email = channel !== "sms" || !user.phone;
  const label = [email && maskEmail(user.email), sms && maskNgPhone(user.phone)].filter(Boolean).join(" and ");
  return { email, sms, label };
}

/**
 * Sends a fresh 6-digit code by email and/or SMS (Settings decide; email if there's no phone).
 * Earlier codes stop working. For sign-up, pass "verify": it's stored as verify_email or verify_phone.
 */
export async function issueOtp(user: Pick<User, "id" | "phone" | "email" | "firstName">, kind: "verify" | "reset_password"): Promise<IssueResult> {
  const dest = await codeDestinations(user);
  const purpose: OtpPurpose = kind === "reset_password" ? "reset_password" : dest.email ? "verify_email" : "verify_phone";
  const family: OtpPurpose[] = kind === "verify" ? ["verify_email", "verify_phone"] : ["reset_password"];
  const db = await getDb();
  const [latest] = await db.select().from(otpCodes).where(and(eq(otpCodes.userId, user.id), inArray(otpCodes.purpose, family))).orderBy(desc(otpCodes.createdAt)).limit(1);
  if (latest && Date.now() - latest.createdAt.getTime() < RESEND_AFTER_MS) {
    return { ok: false, error: "Please wait a moment before asking for another code.", retryInSeconds: Math.ceil((RESEND_AFTER_MS - (Date.now() - latest.createdAt.getTime())) / 1000) };
  }
  const [{ n }] = await db.select({ n: count() }).from(otpCodes).where(and(eq(otpCodes.userId, user.id), inArray(otpCodes.purpose, family), gte(otpCodes.createdAt, new Date(Date.now() - 60 * 60 * 1000))));
  if (n >= MAX_PER_HOUR) return { ok: false, error: "Too many codes requested. Try again in an hour." };

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await db.update(otpCodes).set({ consumedAt: new Date() }).where(and(eq(otpCodes.userId, user.id), inArray(otpCodes.purpose, family), isNull(otpCodes.consumedAt)));
  await db.insert(otpCodes).values({ userId: user.id, purpose, codeHash: hash(code), expiresAt: new Date(Date.now() + TTL_MS) });

  if (dest.email) await sendTemplate(user.email, kind === "verify" ? "verification_code" : "password_reset_code", { name: user.firstName, code, minutes: 10 });
  if (dest.sms && user.phone) await sendSms(user.phone, SMS_TEXT[kind === "verify" ? "verify" : "reset_password"](code));

  const delivering = (dest.email && (await emailConfigured())) || (dest.sms && (await smsConfigured()));
  if (process.env.NODE_ENV !== "production" && !delivering) {
    (await cookies()).set(DEV_OTP_COOKIE, code, { httpOnly: true, sameSite: "lax", path: "/", maxAge: TTL_MS / 1000 });
  }
  return { ok: true, sentTo: dest.label };
}

export type VerifyResult = { ok: true; purpose: OtpPurpose } | { ok: false; error: string };

/** Checks a code against the newest unused one of the given kind(s). */
export async function verifyOtp(userId: number, purposes: OtpPurpose | OtpPurpose[], code: string): Promise<VerifyResult> {
  const kinds = Array.isArray(purposes) ? purposes : [purposes];
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return { ok: false, error: "Enter the 6-digit code." };
  const db = await getDb();
  const [row] = await db.select().from(otpCodes)
    .where(and(eq(otpCodes.userId, userId), inArray(otpCodes.purpose, kinds), isNull(otpCodes.consumedAt), gt(otpCodes.expiresAt, new Date())))
    .orderBy(desc(otpCodes.createdAt)).limit(1);
  if (!row) return { ok: false, error: "That code has expired. Request a new one." };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Too many wrong attempts. Request a new code." };

  if (!timingSafeEqual(Buffer.from(row.codeHash), Buffer.from(hash(clean)))) {
    await db.update(otpCodes).set({ attempts: row.attempts + 1 }).where(eq(otpCodes.id, row.id));
    const left = MAX_ATTEMPTS - row.attempts - 1;
    return { ok: false, error: left > 0 ? `That code isn't right. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many wrong attempts. Request a new code." };
  }
  await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, row.id));
  (await cookies()).delete(DEV_OTP_COOKIE);
  return { ok: true, purpose: row.purpose };
}
