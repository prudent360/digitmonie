"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer, requirePermission } from "@/lib/auth";
import { decideSubmission, submitAddress, submitNinSelfie, submitTier1 } from "@/lib/kyc/service";
import { addressDocumentFrom } from "@/lib/form-files";
import type { FormState } from "./auth";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function done(outcome: Awaited<ReturnType<typeof submitTier1>>, fields?: Record<string, string>): FormState {
  if (!outcome.ok) return { error: outcome.error, fields };
  revalidatePath("/dashboard", "layout");
  return { notice: outcome.message };
}

export async function verifyTier1(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireCustomer();
  const fields = { idKind: str(fd, "idKind"), idNumber: str(fd, "idNumber"), dateOfBirth: str(fd, "dateOfBirth") };
  return done(await submitTier1(user, { ...fields, consent: fd.get("consent") === "on" }), fields);
}

export async function verifyNin(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireCustomer();
  const fields = { nin: str(fd, "nin") };
  return done(await submitNinSelfie(user, { nin: fields.nin, selfie: str(fd, "selfie") }), fields);
}

export async function verifyAddress(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireCustomer();
  const fields = { addressLine: str(fd, "addressLine"), city: str(fd, "city"), state: str(fd, "state") };
  const document = await addressDocumentFrom(fd.get("document"));
  if (typeof document !== "string") return { ...document, fields };
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
