import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resetTemplate, saveTemplate, sendTestTemplate } from "@/app/actions/email";
import { TemplateEditor } from "@/components/app/email-admin";
import { ActionButton } from "@/components/app/loan-staff";
import { Card, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { getTemplate, renderEmail, sampleVars } from "@/lib/email";
import { COMMON_VARIABLES, EMAIL_TEMPLATES, isTemplateKey } from "@/lib/email-templates";

export const metadata: Metadata = { title: "Edit email" };

export default async function EditEmailPage({ params }: { params: Promise<{ key: string }> }) {
  const admin = await requirePermission("settings.manage");
  const { key } = await params;
  if (!isTemplateKey(key)) notFound();
  const def = EMAIL_TEMPLATES[key];
  const current = await getTemplate(key);
  const preview = await renderEmail(current, { ...sampleVars(key), name: admin.firstName });
  const variables = Object.keys({ ...COMMON_VARIABLES, ...def.variables });

  return (
    <div className="space-y-6">
      <Link href="/console/settings?tab=templates" className="text-sm font-semibold text-brand">← Email templates</Link>
      <PageHeader title={def.name} subtitle={def.description} actions={<ActionButton action={sendTestTemplate.bind(null, key)} label="Send a test to me" tone="secondary" />} />
      <div className="grid items-start gap-6 2xl:grid-cols-2">
        <Card className="p-5">
          <TemplateEditor action={saveTemplate.bind(null, key)} subject={current.subject} body={current.body} />
          <div className="mt-5 rounded-[5px] border border-line bg-canvas p-4 text-[13px] leading-relaxed text-body">
            <p className="mb-2 font-semibold text-ink">How to write templates</p>
            <p>Markdown: <code>**bold**</code>, <code>- list item</code>, <code>&gt; highlighted note</code>, <code>[link text](https://…)</code>. A line starting with <code># </code> shows large (used for codes).</p>
            <p>A button: put <code>[[Button label|{"{{url}}"}]]</code> on its own line.</p>
            <p className="mt-2">Available values:</p>
            <ul className="mt-1 flex flex-wrap gap-1.5">{variables.map((v) => <li key={v}><code className="rounded-[3px] bg-white px-1.5 py-0.5 text-brand">{`{{${v}}}`}</code></li>)}</ul>
          </div>
          {current.customised && <div className="mt-4"><ActionButton action={resetTemplate.bind(null, key)} label="Restore original wording" tone="secondary" confirm="Replace your edits with the original wording?" /></div>}
        </Card>
        <Card className="p-5">
          <h2 className="text-[15px] font-bold text-ink">Preview</h2>
          <p className="mt-2 text-sm text-muted"><b className="text-ink">Subject:</b> {preview.subject}</p>
          <iframe title="Email preview" srcDoc={preview.html} sandbox="" className="mt-3 h-[680px] w-full rounded-[5px] border border-line bg-canvas" />
          <p className="mt-2 text-xs text-muted">Shown with sample values. Save to refresh the preview.</p>
        </Card>
      </div>
    </div>
  );
}
