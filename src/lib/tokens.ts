import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { authTokens } from "@/db/schema";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Issues an invitation link token. Earlier unused invitations for the user stop working. */
export async function issueInviteToken(userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const db = await getDb();
  await db.update(authTokens).set({ usedAt: new Date() }).where(and(eq(authTokens.userId, userId), isNull(authTokens.usedAt)));
  await db.insert(authTokens).values({ userId, purpose: "invite", tokenHash: hash(token), expiresAt: new Date(Date.now() + INVITE_TTL_MS) });
  return token;
}

/** The user id for a valid, unused invitation, without using it up. */
export async function peekInviteToken(token: string): Promise<number | null> {
  if (!token) return null;
  const [row] = await (await getDb()).select().from(authTokens)
    .where(and(eq(authTokens.tokenHash, hash(token)), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())));
  return row?.userId ?? null;
}

export async function consumeInviteToken(token: string): Promise<number | null> {
  if (!token) return null;
  const [row] = await (await getDb()).update(authTokens).set({ usedAt: new Date() })
    .where(and(eq(authTokens.tokenHash, hash(token)), isNull(authTokens.usedAt), gt(authTokens.expiresAt, new Date())))
    .returning();
  return row?.userId ?? null;
}
