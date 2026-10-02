import "server-only";
import { and, count, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db";
import { kycDocuments, kycProfiles, kycSubmissions, users, type KycStatus } from "@/db/schema";

const reviewer = alias(users, "reviewer");

export async function pendingKycCount(): Promise<number> {
  const [{ n }] = await (await getDb()).select({ n: count() }).from(kycSubmissions).where(eq(kycSubmissions.status, "pending_review"));
  return n;
}

export async function listKycSubmissions(status: KycStatus, limit = 100) {
  return (await getDb())
    .select({ s: kycSubmissions, firstName: users.firstName, lastName: users.lastName, email: users.email, currentTier: users.kycTier })
    .from(kycSubmissions).innerJoin(users, eq(users.id, kycSubmissions.userId))
    .where(eq(kycSubmissions.status, status))
    .orderBy(status === "pending_review" ? kycSubmissions.createdAt : desc(kycSubmissions.createdAt))
    .limit(limit);
}

export async function getKycSubmission(id: number) {
  const db = await getDb();
  const [row] = await db
    .select({ s: kycSubmissions, user: users, reviewerFirst: reviewer.firstName, reviewerLast: reviewer.lastName })
    .from(kycSubmissions).innerJoin(users, eq(users.id, kycSubmissions.userId)).leftJoin(reviewer, eq(reviewer.id, kycSubmissions.reviewedById))
    .where(eq(kycSubmissions.id, id));
  if (!row) return null;
  const [profile] = await db.select().from(kycProfiles).where(eq(kycProfiles.userId, row.user.id));
  const documents = await db.select({ id: kycDocuments.id, kind: kycDocuments.kind, mimeType: kycDocuments.mimeType, size: kycDocuments.size }).from(kycDocuments).where(eq(kycDocuments.submissionId, id));
  const history = await db.select().from(kycSubmissions).where(and(eq(kycSubmissions.userId, row.user.id))).orderBy(desc(kycSubmissions.createdAt));
  return { ...row, profile: profile ?? null, documents, history };
}
