import "server-only";
import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { clientAddress } from "./rate-limit";

type Entry = {
  actorId: number | null;
  action: string;
  summary: string;
  target?: { type: string; id: string | number };
  details?: Record<string, unknown>;
};

/** Records who did what. Never include passwords, PINs, codes or secrets in `details`. */
export async function logAudit(entry: Entry): Promise<void> {
  await (await getDb()).insert(auditLogs).values({
    actorId: entry.actorId,
    action: entry.action,
    summary: entry.summary,
    targetType: entry.target?.type ?? null,
    targetId: entry.target ? String(entry.target.id) : null,
    details: entry.details ?? null,
    ip: await clientAddress(),
  });
}
