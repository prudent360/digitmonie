import "server-only";
import { count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import { auditLogs, users } from "@/db/schema";

const actor = alias(users, "actor");

export type AuditRow = { id: number; action: string; summary: string; targetType: string | null; targetId: string | null; ip: string | null; createdAt: Date; actorName: string | null; actorEmail: string | null };

/** Newest first, with the actor's name. `query` matches the summary, action or actor email. */
export async function listAudit({ limit = 50, offset = 0, query }: { limit?: number; offset?: number; query?: string } = {}): Promise<{ rows: AuditRow[]; total: number }> {
  const db = await getDb();
  const where: SQL | undefined = query ? or(ilike(auditLogs.summary, `%${query}%`), ilike(auditLogs.action, `%${query}%`), ilike(actor.email, `%${query}%`)) : undefined;
  const rows = await db
    .select({
      id: auditLogs.id, action: auditLogs.action, summary: auditLogs.summary, targetType: auditLogs.targetType, targetId: auditLogs.targetId,
      ip: auditLogs.ip, createdAt: auditLogs.createdAt, firstName: actor.firstName, lastName: actor.lastName, actorEmail: actor.email,
    })
    .from(auditLogs).leftJoin(actor, eq(actor.id, auditLogs.actorId)).where(where)
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id)).limit(limit).offset(offset);
  const [{ n }] = await db.select({ n: count() }).from(auditLogs).leftJoin(actor, eq(actor.id, auditLogs.actorId)).where(where);
  return {
    total: n,
    rows: rows.map(({ firstName, lastName, ...r }) => ({ ...r, actorName: firstName ? `${firstName} ${lastName}` : null })),
  };
}
