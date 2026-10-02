"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";
import { getBranding, LOGO_SIZE, prepareImage } from "@/lib/branding";
import { deletePublicFile, isEmptyFile, savePublicFile, UploadError } from "@/lib/storage";
import type { FormState } from "./auth";

const SLOTS = [
  { field: "logo", key: "logoUrl", kind: "logo", label: "light-background logo" },
  { field: "logoDark", key: "logoDarkUrl", kind: "logo", label: "dark-background logo" },
  { field: "favicon", key: "faviconUrl", kind: "favicon", label: "favicon" },
] as const;

export async function saveBranding(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requirePermission("settings.manage");
  const current = await getBranding();
  const db = await getDb();
  const changed: string[] = [];
  const stale: (string | null)[] = [];

  try {
    for (const slot of SLOTS) {
      const file = fd.get(slot.field);
      const previous = current[slot.key];
      let next: string | null | undefined;
      if (fd.get(`remove_${slot.field}`) === "on") next = null;
      else if (!isEmptyFile(file)) next = await savePublicFile(await prepareImage(file as File, slot.kind), "branding", "png", "image/png");
      if (next === undefined || next === previous) continue;
      if (next) await db.insert(settings).values({ key: slot.key, value: next, updatedById: admin.id }).onConflictDoUpdate({ target: settings.key, set: { value: next, updatedById: admin.id, updatedAt: new Date() } });
      else await db.delete(settings).where(eq(settings.key, slot.key));
      stale.push(previous);
      changed.push(next ? `uploaded a new ${slot.label}` : `removed the ${slot.label}`);
    }
  } catch (error) {
    if (error instanceof UploadError) return { error: error.message };
    throw error;
  }

  // Logo heights (sliders).
  for (const [field, label] of [["logoSizeLight", "light-background logo height"], ["logoSizeDark", "dark-background logo height"]] as const) {
    const raw = fd.get(field);
    if (raw == null) continue;
    const size = Math.min(LOGO_SIZE.max, Math.max(LOGO_SIZE.min, Math.round(Number(raw))));
    if (!Number.isFinite(size) || size === current[field]) continue;
    await db.insert(settings).values({ key: field, value: size, updatedById: admin.id }).onConflictDoUpdate({ target: settings.key, set: { value: size, updatedById: admin.id, updatedAt: new Date() } });
    changed.push(`set the ${label} to ${size}px`);
  }

  for (const url of stale) await deletePublicFile(url);
  if (!changed.length) return { notice: "Nothing changed." };
  await logAudit({ actorId: admin.id, action: "settings.branding", summary: changed.join("; "), target: { type: "settings", id: "branding" } });
  revalidatePath("/", "layout");
  return { notice: "Branding saved. It's live everywhere now." };
}
