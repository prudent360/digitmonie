"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { saveSection } from "@/lib/settings";
import type { Integration } from "@/lib/settings/definitions";
import { testIntegration } from "@/lib/settings/tests";
import type { FormState } from "./auth";

export async function saveSettings(sectionId: string, _: FormState, fd: FormData): Promise<FormState> {
  const admin = await requirePermission("settings.manage");
  const result = await saveSection(sectionId, fd, admin.id);
  if (!result.ok) return { error: result.error };
  revalidatePath("/", "layout");
  return { notice: result.changed.length ? `Saved ${result.changed.length} change${result.changed.length > 1 ? "s" : ""}.` : "Nothing changed." };
}

export async function runIntegrationTest(kind: Integration): Promise<{ ok: boolean; message: string }> {
  const admin = await requirePermission("settings.manage");
  const result = await testIntegration(kind);
  await logAudit({ actorId: admin.id, action: "settings.tested", summary: `tested the ${kind} connection: ${result.ok ? "connected" : "failed"}`, target: { type: "settings", id: kind } });
  return result;
}
