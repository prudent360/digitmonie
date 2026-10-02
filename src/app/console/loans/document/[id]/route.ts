import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { loanDocuments } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";

/** Serves an uploaded bank statement to loan reviewers. Never cached, never public; every view is logged. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission("loans.review");
  const { id } = await params;
  const [doc] = await (await getDb()).select().from(loanDocuments).where(eq(loanDocuments.id, Number(id)));
  if (!doc) return new Response("Not found", { status: 404 });
  await logAudit({ actorId: staff.id, action: "loan.document_viewed", summary: `opened the bank statement for loan #${doc.loanId}`, target: { type: "loan", id: doc.loanId } });
  return new Response(Buffer.from(doc.data, "base64"), {
    headers: { "Content-Type": doc.mimeType, "Content-Disposition": `inline; filename="${doc.fileName.replace(/"/g, "")}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
