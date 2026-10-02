import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Badge, Card, PageHeader, StatusBadge } from "@/components/ui";
import { getDb } from "@/db";
import { emailLog } from "@/db/schema";
import { requirePermission } from "@/lib/auth";
import { EMAIL_TEMPLATES, type TemplateKey } from "@/lib/email-templates";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Email" };

export default async function EmailLogPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("settings.manage");
  const [e] = await (await getDb()).select().from(emailLog).where(eq(emailLog.id, Number((await params).id)));
  if (!e) notFound();
  return (
    <div className="space-y-6">
      <Link href="/console/settings?tab=email" className="text-sm font-semibold text-brand">← Email settings</Link>
      <PageHeader title={e.subject} subtitle={`To ${e.to} · ${formatDate(e.createdAt.toISOString(), { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} · ${EMAIL_TEMPLATES[e.template as TemplateKey]?.name ?? e.template}`}
        actions={e.status === "logged" ? <Badge>Logged only</Badge> : e.status === "skipped" ? <Badge>Switched off</Badge> : <StatusBadge status={e.status === "sent" ? "successful" : "failed"} />} />
      {e.error && <p className="rounded-[7px] bg-danger-soft px-4 py-3 text-sm text-danger">{e.error}</p>}
      <Card className="p-5">
        <p className="mb-3 text-xs text-muted">Verification codes are masked in this copy.</p>
        <iframe title="Email" srcDoc={e.html} sandbox="" className="h-[720px] w-full rounded-[7px] border border-line bg-canvas" />
      </Card>
    </div>
  );
}
