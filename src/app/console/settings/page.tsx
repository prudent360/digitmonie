import type { Metadata } from "next";
import Link from "next/link";
import { runIntegrationTest, saveSettings } from "@/app/actions/settings";
import { SettingsForm } from "@/components/app/settings-form";
import { EmailSettingsForm } from "@/components/app/email-settings-form";
import { BrandingForm } from "@/components/app/branding-form";
import { saveBranding } from "@/app/actions/branding";
import { getBranding } from "@/lib/branding";
import { ActionButton } from "@/components/app/loan-staff";
import { sendTestEmailNow, setTemplateEnabled } from "@/app/actions/email";
import { Badge, StatusBadge, Table } from "@/components/ui";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { emailLog, emailTemplates } from "@/db/schema";
import { emailConfig } from "@/lib/email";
import { COMMON_VARIABLES, EMAIL_TEMPLATES, REQUIRED_TEMPLATES, type TemplateKey } from "@/lib/email-templates";
import { formatDate } from "@/lib/format";
import { Card, PageHeader } from "@/components/ui";
import { requirePermission } from "@/lib/auth";
import { describeSection } from "@/lib/settings";
import { SECTIONS } from "@/lib/settings/definitions";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  await requirePermission("settings.manage");
  const { tab } = await searchParams;
  const section = SECTIONS.find((s) => s.id === tab) ?? SECTIONS[0];
  const state = await describeSection(section.id);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Changes take effect immediately and are recorded in the audit log. Keys are encrypted and never shown again in full." />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Settings sections">
          {SECTIONS.map((s) => (
            <Link key={s.id} href={`/console/settings?tab=${s.id}`} aria-current={s.id === section.id ? "page" : undefined} className={`shrink-0 rounded-[5px] px-4 py-2.5 text-sm font-semibold ${s.id === section.id ? "bg-brand text-white" : "text-body hover:bg-white hover:text-brand"}`}>
              {s.title}
            </Link>
          ))}
        </nav>
        <Card className="p-6">
          <h2 className="font-display text-lg font-bold text-ink">{section.title}</h2>
          <p className="mt-1 text-sm text-muted">{section.description}</p>
          <div className="mt-6">
            {section.custom === "branding" ? <BrandingForm key="branding" action={saveBranding} {...(await getBranding())} />
              : section.custom === "email" ? <EmailPanel state={state} />
              : section.custom === "templates" ? <TemplatesPanel />
              : /* key resets the form when switching sections */ <SettingsForm key={section.id} section={section} state={state} action={saveSettings.bind(null, section.id)} test={runIntegrationTest} />}
          </div>
        </Card>
      </div>
    </div>
  );
}

async function EmailPanel({ state }: { state: Awaited<ReturnType<typeof describeSection>> }) {
  const [cfg, log] = await Promise.all([emailConfig(), (await getDb()).select().from(emailLog).orderBy(desc(emailLog.createdAt)).limit(15)]);
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[5px] border border-line bg-canvas p-4">
        {cfg.ready
          ? <Badge tone="success" dot>Delivering with {cfg.driver === "smtp" ? "SMTP" : "Resend"}</Badge>
          : <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning ring-1 ring-inset ring-warning/15"><span className="size-1.5 rounded-full bg-current" />{cfg.driver === "log" ? "Log only: nothing is delivered" : cfg.driver === "smtp" ? "SMTP isn't fully set up, so emails are only logged" : "No Resend key yet, so emails are only logged"}</span>}
        <ActionButton action={sendTestEmailNow} label="Send a test email to me" tone="secondary" />
      </div>
      <EmailSettingsForm action={saveSettings.bind(null, "email")} state={state} from={cfg.from} />
      <section>
        <h3 className="mb-3 text-sm font-bold text-ink">Recent emails</h3>
        <div className="overflow-hidden rounded-[5px] border border-line">
          <Table head={["When", "To", "Subject", "Template", "Status"]}>
            {log.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap px-5 py-2.5 text-muted">{formatDate(e.createdAt.toISOString(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-5 py-2.5 text-body">{e.to}</td>
                <td className="px-5 py-2.5"><Link href={`/console/settings/emails/log/${e.id}`} className="font-semibold text-ink hover:text-brand">{e.subject}</Link></td>
                <td className="px-5 py-2.5 text-muted">{EMAIL_TEMPLATES[e.template as TemplateKey]?.name ?? e.template}</td>
                <td className="px-5 py-2.5">{e.status === "logged" ? <Badge>Logged only</Badge> : e.status === "skipped" ? <Badge>Switched off</Badge> : <StatusBadge status={e.status === "sent" ? "successful" : "failed"} />}{e.status === "failed" && e.error && <p className="mt-1 max-w-[260px] text-xs text-danger">{e.error}</p>}</td>
              </tr>
            ))}
            {!log.length && <tr><td colSpan={5} className="px-5 py-10 text-center text-muted">No emails yet.</td></tr>}
          </Table>
        </div>
      </section>
    </div>
  );
}

async function TemplatesPanel() {
  const rows = await (await getDb()).select().from(emailTemplates);
  const groups = ["Security", "Account", "Verification", "Loans"] as const;
  return (
    <div className="space-y-6">
      <p className="rounded-[5px] bg-brand-50 px-4 py-3 text-sm text-body">Edit the wording of each automatic email. Insert values with placeholders like <code className="font-mono text-brand">{"{{name}}"}</code>; the DigitMonie layout, buttons and footer are added for you. Security emails can&apos;t be switched off.</p>
      {groups.map((g) => (
        <section key={g}>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">{g}</h3>
          <ul className="space-y-3">
            {(Object.entries(EMAIL_TEMPLATES) as [TemplateKey, (typeof EMAIL_TEMPLATES)[TemplateKey]][]).filter(([, d]) => d.group === g).map(([key, def]) => {
              const row = rows.find((r) => r.key === key);
              const required = REQUIRED_TEMPLATES.includes(key);
              const enabled = required || (row?.enabled ?? true);
              const customised = Boolean(row && (row.subject !== def.subject || row.body !== def.body));
              return (
                <li key={key} className={`rounded-[5px] border p-4 ${enabled ? "border-line bg-white" : "border-dashed border-line bg-canvas"}`}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="flex flex-wrap items-center gap-2"><b className="text-ink">{def.name}</b>{required ? <Badge tone="brand">Required</Badge> : enabled ? <Badge tone="success">On</Badge> : <Badge>Off</Badge>}{customised && <Badge tone="gold">Edited</Badge>}</p>
                      <p className="text-sm text-muted">{def.description}</p>
                      <p className="text-xs text-muted">Subject: <span className="font-medium text-body">{row?.subject ?? def.subject}</span></p>
                      <p className="flex flex-wrap gap-1 pt-1">{Object.keys({ ...COMMON_VARIABLES, ...def.variables }).map((v) => <code key={v} className="rounded-[3px] bg-canvas px-1.5 py-0.5 text-[11px] text-muted">{`{{${v}}}`}</code>)}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-start gap-2">
                      <Link href={`/console/settings/emails/${key}`} className="rounded-[5px] bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-600">Edit &amp; preview</Link>
                      {!required && <ActionButton action={setTemplateEnabled.bind(null, key, !enabled)} label={enabled ? "Turn off" : "Turn on"} tone="secondary" />}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
