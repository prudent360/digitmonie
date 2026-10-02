"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth";
import { forceSignOut, logContact, setCustomerStatus, unlockPin, type Result } from "@/lib/customers";
import type { UserStatus } from "@/db/schema";
import type { FormState } from "./auth";

const done = (r: Result, customerId: number): FormState => {
  if (!r.ok) return { error: r.error };
  revalidatePath(`/console/customers/${customerId}`);
  revalidatePath("/console", "layout");
  return { notice: r.message };
};

export async function setStatusAction(customerId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await requirePermission("users.manage");
  const status = String(fd.get("status")) as Exclude<UserStatus, "pending">;
  if (!["active", "restricted", "frozen", "closed"].includes(status)) return { error: "Choose a status." };
  return done(await setCustomerStatus(staff, customerId, status, String(fd.get("reason") ?? "")), customerId);
}

export async function unlockPinAction(customerId: number): Promise<FormState> {
  return done(await unlockPin(await requirePermission("users.manage"), customerId), customerId);
}

export async function forceSignOutAction(customerId: number): Promise<FormState> {
  return done(await forceSignOut(await requirePermission("users.manage"), customerId), customerId);
}

export async function logContactAction(customerId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await requirePermission("users.view");
  const loanId = Number(fd.get("loanId")) || null;
  const r = await logContact(staff, { customerId, loanId, channel: String(fd.get("channel") ?? ""), outcome: String(fd.get("outcome") ?? ""), note: String(fd.get("note") ?? "") });
  if (r.ok && loanId) revalidatePath(`/console/loans/${loanId}`);
  return done(r, customerId);
}
