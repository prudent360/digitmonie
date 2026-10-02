import type { Metadata } from "next";
import Link from "next/link";
import { runIntegrationTest, saveSettings } from "@/app/actions/settings";
import { SettingsForm } from "@/components/app/settings-form";
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
            {/* key resets the form when switching sections */}
            <SettingsForm key={section.id} section={section} state={state} action={saveSettings.bind(null, section.id)} test={runIntegrationTest} />
          </div>
        </Card>
      </div>
    </div>
  );
}
