"use server";

import bcrypt from "bcryptjs";
import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { finishSignIn, requireCustomer } from "@/lib/auth";
import { passwordProblem, pinProblem } from "@/lib/password";
import { verifyTransactionPin } from "@/lib/pin";
import type { FormState } from "./auth";

const profileSchema = z.object({
  firstName: z.string().trim().min(2, "Enter your first name.").max(60),
  lastName: z.string().trim().min(2, "Enter your last name.").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireCustomer();
  const raw = { firstName: String(fd.get("firstName") ?? ""), lastName: String(fd.get("lastName") ?? ""), email: String(fd.get("email") ?? "") };
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: raw };

  const db = await getDb();
  const [taken] = await db.select({ id: users.id }).from(users).where(and(eq(sql`lower(${users.email})`, parsed.data.email), ne(users.id, user.id)));
  if (taken) return { error: "Another account already uses that email.", fields: raw };

  const emailChanged = parsed.data.email !== user.email;
  await db.update(users).set({ ...parsed.data, ...(emailChanged ? { emailVerifiedAt: null } : {}) }).where(eq(users.id, user.id));
  if (emailChanged) await logAudit({ actorId: user.id, action: "account.email_changed", summary: "changed their email address", target: { type: "user", id: user.id }, details: { from: user.email, to: parsed.data.email } });
  revalidatePath("/dashboard", "layout");
  return { notice: "Profile saved.", fields: parsed.data };
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireCustomer();
  if (!user.passwordHash || !(await bcrypt.compare(String(fd.get("current") ?? ""), user.passwordHash))) return { error: "Your current password isn't right." };
  const next = String(fd.get("password") ?? "");
  const problem = passwordProblem(next, "New password");
  if (problem) return { error: problem };
  if (next !== String(fd.get("confirm") ?? "")) return { error: "The two new passwords don't match." };

  // Signs out every other device, then keeps this one signed in.
  const sessionVersion = user.sessionVersion + 1;
  await (await getDb()).update(users).set({ passwordHash: await bcrypt.hash(next, 12), sessionVersion }).where(eq(users.id, user.id));
  await logAudit({ actorId: user.id, action: "account.password_changed", summary: "changed their password", target: { type: "user", id: user.id } });
  await finishSignIn({ ...user, sessionVersion });
  return { notice: "Password changed. Your other devices have been signed out." };
}

export async function changePin(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireCustomer();
  if (user.pinHash) {
    const check = await verifyTransactionPin(user, String(fd.get("current") ?? ""));
    if (!check.ok) return { error: check.error.replace("Wrong PIN", "Your current PIN isn't right") };
  }
  const pin = String(fd.get("pin") ?? "");
  const problem = pinProblem(pin);
  if (problem) return { error: problem };
  if (pin !== String(fd.get("confirm") ?? "")) return { error: "The two new PINs don't match." };
  await (await getDb()).update(users).set({ pinHash: await bcrypt.hash(pin, 12), pinAttempts: 0, pinLockedUntil: null }).where(eq(users.id, user.id));
  await logAudit({ actorId: user.id, action: "account.pin_changed", summary: "changed their transaction PIN", target: { type: "user", id: user.id } });
  return { notice: "Transaction PIN changed." };
}

export async function signOutEverywhere() {
  const user = await requireCustomer();
  await (await getDb()).update(users).set({ sessionVersion: user.sessionVersion + 1 }).where(eq(users.id, user.id));
  await logAudit({ actorId: user.id, action: "account.signed_out_everywhere", summary: "signed out of all devices", target: { type: "user", id: user.id } });
  redirect("/login");
}
