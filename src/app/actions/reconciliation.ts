"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { toKobo } from "@/lib/loans/math";
import { recordFunding, resolveItem, runReconciliation } from "@/lib/reconciliation";
import type { FormState } from "./auth";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function runReconciliationAction(_: FormState, fd: FormData): Promise<FormState> {
  const staff = await requirePermission("finance.manage");
  const r = await runReconciliation(str(fd, "date"), staff.id);
  if (!r.ok) return { error: r.error };
  revalidatePath("/console/reconciliation");
  redirect(`/console/reconciliation?run=${r.runId}`);
}

export async function resolveItemAction(itemId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await requirePermission("finance.manage");
  const r = await resolveItem(staff, itemId, str(fd, "note"), fd.get("recheck") === "1");
  if (!r.ok) return { error: r.error };
  revalidatePath("/console/reconciliation");
  return { notice: r.message };
}

export async function recordFundingAction(_: FormState, fd: FormData): Promise<FormState> {
  const staff = await requirePermission("finance.manage");
  const r = await recordFunding(staff, {
    account: str(fd, "account") === "bank" ? "bank" : "flutterwave",
    direction: str(fd, "direction") === "out" ? "out" : "in",
    amountKobo: toKobo(Number(str(fd, "amount").replace(/[₦,\s]/g, ""))),
    note: str(fd, "note"), date: str(fd, "date"),
  });
  if (!r.ok) return { error: r.error };
  revalidatePath("/console", "layout");
  return { notice: r.message };
}
