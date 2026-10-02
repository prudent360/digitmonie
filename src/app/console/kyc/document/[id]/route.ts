import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { kycDocuments } from "@/db/schema";
import { requirePermission } from "@/lib/auth";

/** Serves a KYC image or PDF to staff who can review KYC. Never cached, never public. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePermission("kyc.review");
  const { id } = await params;
  const [doc] = await (await getDb()).select().from(kycDocuments).where(eq(kycDocuments.id, Number(id)));
  if (!doc) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(doc.data, "base64"), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
