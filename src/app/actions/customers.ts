"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import { fullName, getCurrentUser, requirePermission, stopViewingAs, viewingAs } from "@/lib/auth";
import { beginViewingAs, deleteCustomer, forceSignOut, logContact, setCustomerStatus, unlockPin, updateCustomerDetails, type Result } from "@/lib/customers";
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

export async function updateDetailsAction(customerId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await requirePermission("users.manage");
  const input = { firstName: String(fd.get("firstName") ?? ""), lastName: String(fd.get("lastName") ?? ""), email: String(fd.get("email") ?? ""), phone: String(fd.get("phone") ?? ""), reason: String(fd.get("reason") ?? "") };
  return done(await updateCustomerDetails(staff, customerId, input), customerId);
}

export async function deleteCustomerAction(customerId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await requirePermission("users.manage");
  const r = await deleteCustomer(staff, customerId, String(fd.get("confirmEmail") ?? ""));
  if (!r.ok) return { error: r.error };
  revalidatePath("/console", "layout");
  redirect("/console/customers?deleted=1");
}

export async function viewAsAction(customerId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await requirePermission("users.view_as");
  const r = await beginViewingAs(staff, customerId, String(fd.get("reason") ?? ""));
  if (!r.ok) return { error: r.error };
  redirect("/dashboard");
}

/** Leaves a customer's account and goes back to the console (or to sign-in if the staff session has ended). */
export async function stopViewingAction() {
  const viewer = await viewingAs();
  const customer = viewer ? await getCurrentUser() : null;
  const staff = await stopViewingAs();
  if (!staff) redirect("/login");
  if (customer) await logAudit({ actorId: staff.id, action: "customer.view_as_ended", summary: `finished viewing ${fullName(customer)}'s account`, target: { type: "user", id: customer.id } });
  redirect(customer ? `/console/customers/${customer.id}` : "/console");
}
