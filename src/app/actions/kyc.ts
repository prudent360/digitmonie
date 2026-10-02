"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer, requirePermission } from "@/lib/auth";
import { decideSubmission, submitAddress, submitBvn, submitNinSelfie } from "@/lib/kyc/service";
import type { FormState } from "./auth";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const DOC_TYPES = ["image/jpeg", "image/png", "application/pdf"];

function done(outcome: Awaited<ReturnType<typeof submitBvn>>, fields?: Record<string, string>): FormState {
  if (!outcome.ok) return { error: outcome.error, fields };
  revalidatePath("/dashboard", "layout");
  return { notice: outcome.message };
}

export async function verifyBvn(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireCustomer();
  const fields = { bvn: str(fd, "bvn"), dateOfBirth: str(fd, "dateOfBirth") };
  return done(await submitBvn(user, { ...fields, consent: fd.get("consent") === "on" }), fields);
}

export async function verifyNin(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireCustomer();
  const fields = { nin: str(fd, "nin") };
  return done(await submitNinSelfie(user, { nin: fields.nin, selfie: str(fd, "selfie") }), fields);
}

export async function verifyAddress(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireCustomer();
  const fields = { addressLine: str(fd, "addressLine"), city: str(fd, "city"), state: str(fd, "state") };
  const file = fd.get("document");
  if (!(file instanceof File) || file.size === 0) return { error: "Upload a utility bill or bank statement.", fields };
  if (!DOC_TYPES.includes(file.type)) return { error: "Upload a JPG, PNG or PDF.", fields };
  if (file.size > 3 * 1024 * 1024) return { error: "That file is too large (max 3 MB).", fields };
  const document = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
  return done(await submitAddress(user, { ...fields, document }), fields);
}

export async function decideKyc(submissionId: number, _: FormState, fd: FormData): Promise<FormState> {
  const staff = await requirePermission("kyc.review");
  const decision = fd.get("decision") === "approve" ? "approve" : "reject";
  const result = await decideSubmission(staff, submissionId, decision, str(fd, "reason"));
  if (!result.ok) return { error: result.error };
  revalidatePath("/console/kyc");
  revalidatePath("/console", "layout");
  return { notice: decision === "approve" ? "Approved. The customer has been notified." : "Rejected. The customer has been told why." };
}
