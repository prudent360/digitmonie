"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { fullName, requirePermission } from "@/lib/auth";
import { notifyStaff } from "@/lib/notifications";
import { getSetting, saveSection } from "@/lib/settings";
import type { Integration } from "@/lib/settings/definitions";
import { testIntegration } from "@/lib/settings/tests";
import type { FormState } from "./auth";

export async function saveSettings(sectionId: string, _: FormState, fd: FormData): Promise<FormState> {
  const admin = await requirePermission("settings.manage");
  const twoFactorBefore = await getSetting<boolean>("staffTwoFactor");
  const result = await saveSection(sectionId, fd, admin.id);
  if (!result.ok) return { error: result.error };
  const twoFactorAfter = await getSetting<boolean>("staffTwoFactor");
  if (twoFactorBefore !== twoFactorAfter) {
    // A security downgrade should never go unnoticed: tell every administrator.
    await notifyStaff("settings.manage", {
      category: "security",
      title: twoFactorAfter ? "Two-factor sign-in turned on" : "Two-factor sign-in turned off",
      body: twoFactorAfter
        ? `${fullName(admin)} made two-factor sign-in required for all staff again.`
        : `${fullName(admin)} turned off two-factor sign-in. Staff can now sign in with just a password. If this wasn't expected, turn it back on in Settings → Security.`,
      href: "/console/settings?tab=security",
    });
  }
  revalidatePath("/", "layout");
  return { notice: result.changed.length ? `Saved ${result.changed.length} change${result.changed.length > 1 ? "s" : ""}.` : "Nothing changed." };
}

export async function runIntegrationTest(kind: Integration): Promise<{ ok: boolean; message: string }> {
  const admin = await requirePermission("settings.manage");
  const result = await testIntegration(kind);
  await logAudit({ actorId: admin.id, action: "settings.tested", summary: `tested the ${kind} connection: ${result.ok ? "connected" : "failed"}`, target: { type: "settings", id: kind } });
  return result;
}
