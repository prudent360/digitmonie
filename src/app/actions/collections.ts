"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { assignCollector, createPromise, reschedule, sendCollectionSms, writeOff, type Result } from "@/lib/collections";
import { toKobo } from "@/lib/loans/math";
import type { FormState } from "./auth";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const done = (r: Result, loanId: number): FormState => {
  if (!r.ok) return { error: r.error };
  revalidatePath(`/console/loans/${loanId}`);
  revalidatePath("/console", "layout");
  return { notice: r.message };
};

export async function assignCollectorAction(loanId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await requirePermission("loans.collect");
  return done(await assignCollector(staff, loanId, Number(fd.get("collectorId")) || null), loanId);
}

export async function promiseAction(loanId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await requirePermission("loans.collect");
  const amount = toKobo(Number(str(fd, "amount").replace(/[₦,\s]/g, "")));
  return done(await createPromise(staff, loanId, amount, str(fd, "dueDate")), loanId);
}

export async function reminderSmsAction(loanId: number): Promise<FormState> {
  const staff = await requirePermission("loans.collect");
  return done(await sendCollectionSms(staff, loanId), loanId);
}

export async function rescheduleAction(loanId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await requirePermission("loans.approve");
  return done(await reschedule(staff, loanId, Number(fd.get("months")), fd.get("waive") === "on", str(fd, "note")), loanId);
}

export async function writeOffAction(loanId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await requirePermission("loans.approve");
  return done(await writeOff(staff, loanId, str(fd, "note")), loanId);
}
