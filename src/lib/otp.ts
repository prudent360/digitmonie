import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { and, count, desc, eq, gt, gte, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/db";
import { otpCodes, type OtpPurpose, type User } from "@/db/schema";
import { emailConfigured, sendEmail, sendSms, smsConfigured } from "./messaging";

const TTL_MS = 10 * 60 * 1000;
const RESEND_AFTER_MS = 60 * 1000;
const MAX_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;
/** Local development only: lets the verify screen show the code when no SMS provider is set. */
export const DEV_OTP_COOKIE = "dm_dev_otp";

const hash = (code: string) => createHmac("sha256", `otp:${process.env.SESSION_SECRET ?? ""}`).update(code).digest("hex");

const TEXT: Record<OtpPurpose, (code: string) => string> = {
  verify_phone: (code) => `Your DigitMonie verification code is ${code}. It expires in 10 minutes. Never share it with anyone.`,
  reset_password: (code) => `Your DigitMonie password reset code is ${code}. It expires in 10 minutes. If you didn't ask for this, ignore it.`,
};

export type IssueResult = { ok: true; channel: "sms" | "email" } | { ok: false; error: string; retryInSeconds?: number };

/** Sends a fresh 6-digit code by SMS (or email if the user has no phone). Earlier codes stop working. */
export async function issueOtp(user: Pick<User, "id" | "phone" | "email">, purpose: OtpPurpose): Promise<IssueResult> {
  const db = await getDb();
  const [latest] = await db.select().from(otpCodes).where(and(eq(otpCodes.userId, user.id), eq(otpCodes.purpose, purpose))).orderBy(desc(otpCodes.createdAt)).limit(1);
  if (latest && Date.now() - latest.createdAt.getTime() < RESEND_AFTER_MS) {
    return { ok: false, error: "Please wait a moment before asking for another code.", retryInSeconds: Math.ceil((RESEND_AFTER_MS - (Date.now() - latest.createdAt.getTime())) / 1000) };
  }
  const [{ n }] = await db.select({ n: count() }).from(otpCodes).where(and(eq(otpCodes.userId, user.id), eq(otpCodes.purpose, purpose), gte(otpCodes.createdAt, new Date(Date.now() - 60 * 60 * 1000))));
  if (n >= MAX_PER_HOUR) return { ok: false, error: "Too many codes requested. Try again in an hour." };

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await db.update(otpCodes).set({ consumedAt: new Date() }).where(and(eq(otpCodes.userId, user.id), eq(otpCodes.purpose, purpose), isNull(otpCodes.consumedAt)));
  await db.insert(otpCodes).values({ userId: user.id, purpose, codeHash: hash(code), expiresAt: new Date(Date.now() + TTL_MS) });

  const channel = user.phone ? "sms" : "email";
  if (user.phone) await sendSms(user.phone, TEXT[purpose](code));
  else await sendEmail({ to: user.email, subject: "Your DigitMonie code", text: TEXT[purpose](code) });

  if (process.env.NODE_ENV !== "production" && !(channel === "email" ? await emailConfigured() : await smsConfigured())) {
    (await cookies()).set(DEV_OTP_COOKIE, code, { httpOnly: true, sameSite: "lax", path: "/", maxAge: TTL_MS / 1000 });
  }
  return { ok: true, channel };
}

export type VerifyResult = { ok: true } | { ok: false; error: string };

export async function verifyOtp(userId: number, purpose: OtpPurpose, code: string): Promise<VerifyResult> {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return { ok: false, error: "Enter the 6-digit code." };
  const db = await getDb();
  const [row] = await db.select().from(otpCodes)
    .where(and(eq(otpCodes.userId, userId), eq(otpCodes.purpose, purpose), isNull(otpCodes.consumedAt), gt(otpCodes.expiresAt, new Date())))
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
  return { ok: true };
}
