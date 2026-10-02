import "server-only";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users, type User } from "@/db/schema";
import { logAudit } from "./audit";

const MAX_ATTEMPTS = 5;
const LOCK_MS = 30 * 60 * 1000;

export type PinResult = { ok: true } | { ok: false; error: string };

/** Checks a transaction PIN. Five wrong tries lock PIN use for 30 minutes. */
export async function verifyTransactionPin(user: Pick<User, "id" | "pinHash" | "pinAttempts" | "pinLockedUntil">, pin: string): Promise<PinResult> {
  if (!user.pinHash) return { ok: false, error: "Create a transaction PIN first." };
  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
    const minutes = Math.ceil((user.pinLockedUntil.getTime() - Date.now()) / 60000);
    return { ok: false, error: `Your PIN is locked after too many wrong attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` };
  }
  const db = await getDb();
  if (await bcrypt.compare(pin, user.pinHash)) {
    if (user.pinAttempts) await db.update(users).set({ pinAttempts: 0, pinLockedUntil: null }).where(eq(users.id, user.id));
    return { ok: true };
  }
  const attempts = user.pinAttempts + 1;
  const locked = attempts >= MAX_ATTEMPTS;
  await db.update(users).set({ pinAttempts: locked ? 0 : attempts, pinLockedUntil: locked ? new Date(Date.now() + LOCK_MS) : null }).where(eq(users.id, user.id));
  if (locked) await logAudit({ actorId: user.id, action: "account.pin_locked", summary: "locked their PIN after 5 wrong attempts", target: { type: "user", id: user.id } });
  return { ok: false, error: locked ? "Too many wrong attempts. Your PIN is locked for 30 minutes." : `Wrong PIN. ${MAX_ATTEMPTS - attempts} attempt${MAX_ATTEMPTS - attempts === 1 ? "" : "s"} left.` };
}
