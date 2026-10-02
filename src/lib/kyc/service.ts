import "server-only";
import { createHmac } from "node:crypto";
import { and, desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { kycDocuments, kycProfiles, kycSubmissions, users, type KycChecks, type KycDocumentKind, type KycProfile, type KycStatus, type KycSubmission } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import type { CurrentUser } from "@/lib/auth";
import { sendSms } from "@/lib/messaging";
import { blockedFor, recordFailure } from "@/lib/rate-limit";
import { encryptSecret } from "@/lib/secrets";
import { identityProvider, kycThresholds } from ".";
import { ageOn, nameScore } from "./matching";
import { normalizeDate, ProviderError, type Applicant, type IdentityRecord } from "./provider";
import { NIGERIAN_STATES } from "./states";

export type KycOutcome = { ok: true; status: KycStatus; message: string } | { ok: false; error: string };

const idHash = (kind: "bvn" | "nin", value: string) => createHmac("sha256", `kyc-id:${process.env.SESSION_SECRET ?? ""}`).update(`${kind}:${value}`).digest("hex");

export async function getKycState(userId: number) {
  const db = await getDb();
  const [profile] = await db.select().from(kycProfiles).where(eq(kycProfiles.userId, userId));
  const submissions = await db.select().from(kycSubmissions).where(eq(kycSubmissions.userId, userId)).orderBy(desc(kycSubmissions.createdAt));
  const latest = (tier: number) => submissions.find((s) => s.tier === tier) ?? null;
  return { profile: profile ?? null, latest };
}

async function guard(user: CurrentUser, tier: number): Promise<string | null> {
  if (user.kycTier >= tier) return `You're already verified to Tier ${tier}.`;
  if (user.kycTier < tier - 1) return `Complete Tier ${tier - 1} first.`;
  const [pending] = await (await getDb()).select({ id: kycSubmissions.id }).from(kycSubmissions)
    .where(and(eq(kycSubmissions.userId, user.id), eq(kycSubmissions.tier, tier), eq(kycSubmissions.status, "pending_review")));
  if (pending) return "We're already reviewing your details for this tier.";
  // Every identity lookup costs money and is a guessing risk, so attempts are limited.
  const wait = await blockedFor(String(user.id), "kyc");
  return wait ? `Too many attempts. Try again in ${wait} minute${wait === 1 ? "" : "s"}.` : null;
}

async function idTakenByOther(column: "bvnHash" | "ninHash", hash: string, userId: number) {
  const [row] = await (await getDb()).select({ id: kycProfiles.userId }).from(kycProfiles)
    .where(and(eq(kycProfiles[column], hash), ne(kycProfiles.userId, userId)));
  return Boolean(row);
}

async function record(userId: number, tier: number, status: KycStatus, checks: KycChecks, reason: string | null, docs: { kind: KycDocumentKind; mimeType: string; data: string }[] = []) {
  const db = await getDb();
  const [sub] = await db.insert(kycSubmissions).values({ userId, tier, status, checks, reason, decidedBy: status === "pending_review" ? null : "auto" }).returning();
  for (const d of docs) {
    await db.insert(kycDocuments).values({ submissionId: sub.id, kind: d.kind, mimeType: d.mimeType, data: d.data, size: Math.round((d.data.length * 3) / 4) });
  }
  if (status === "approved") await db.update(users).set({ kycTier: tier }).where(eq(users.id, userId));
  return sub;
}

async function saveProfile(userId: number, values: Partial<typeof kycProfiles.$inferInsert>) {
  await (await getDb()).insert(kycProfiles).values({ userId, ...values, updatedAt: new Date() })
    .onConflictDoUpdate({ target: kycProfiles.userId, set: { ...values, updatedAt: new Date() } });
}

const photoDoc = (r: IdentityRecord) => (r.photo ? [{ kind: "id_photo" as const, mimeType: r.photo.startsWith("/9j") ? "image/jpeg" : "image/png", data: r.photo }] : []);

function providerFailure(error: unknown): KycOutcome {
  console.error("[kyc] provider error", error);
  return { ok: false, error: error instanceof ProviderError ? "Our verification partner isn't responding. Please try again shortly." : "Something went wrong. Please try again." };
}

/* ---------- Tier 1: BVN ---------- */

export async function submitBvn(user: CurrentUser, input: { bvn: string; dateOfBirth: string; consent: boolean }): Promise<KycOutcome> {
  const blocked = await guard(user, 1);
  if (blocked) return { ok: false, error: blocked };
  if (!input.consent) return { ok: false, error: "Please agree to the identity check to continue." };
  const bvn = input.bvn.replace(/\s/g, "");
  if (!/^\d{11}$/.test(bvn)) return { ok: false, error: "Your BVN is 11 digits. Dial *565*0# to get it." };
  const dob = normalizeDate(input.dateOfBirth);
  if (!dob) return { ok: false, error: "Enter your date of birth." };
  if (ageOn(dob) < 18) return { ok: false, error: "You need to be 18 or older to open a DigitMonie account." };

  const hash = idHash("bvn", bvn);
  if (await idTakenByOther("bvnHash", hash, user.id)) {
    await record(user.id, 1, "rejected", { duplicate: true }, "This BVN is already linked to another DigitMonie account.");
    await logAudit({ actorId: user.id, action: "kyc.duplicate_bvn", summary: "tried a BVN already linked to another account", target: { type: "user", id: user.id } });
    return { ok: false, error: "This BVN is already linked to another DigitMonie account. Contact support if that isn't you." };
  }

  const provider = await identityProvider().catch((e: Error) => e);
  if (provider instanceof Error) return providerFailure(new ProviderError(provider.message));
  const { nameMatch } = await kycThresholds();
  const applicant: Applicant = { firstName: user.firstName, lastName: user.lastName, dateOfBirth: dob };
  let found: IdentityRecord | null;
  try {
    found = await provider.lookupBvn(bvn, applicant);
  } catch (error) {
    return providerFailure(error);
  }
  if (!found) {
    await recordFailure(String(user.id), "kyc");
    return { ok: false, error: "We couldn't find that BVN. Check the number and try again." };
  }

  const checks: KycChecks = { provider: provider.name, nameScore: nameScore(user, found), dobMatch: found.dateOfBirth === dob, watchlisted: found.watchlisted };
  let status: KycStatus;
  let reason: string | null = null;
  if (checks.dobMatch && checks.nameScore! >= nameMatch && !checks.watchlisted) status = "approved";
  else if (checks.watchlisted || (checks.dobMatch && checks.nameScore! >= 50)) {
    status = "pending_review";
    reason = checks.watchlisted ? "BVN is on a watch-list." : "Name only partly matches the BVN record.";
  } else {
    status = "rejected";
    reason = "The name or date of birth on your account doesn't match your BVN record.";
  }

  if (status !== "rejected") {
    await saveProfile(user.id, {
      bvnEncrypted: encryptSecret(bvn), bvnHash: hash, bvnLast4: bvn.slice(-4),
      legalFirstName: found.firstName, legalMiddleName: found.middleName, legalLastName: found.lastName,
      dateOfBirth: dob, gender: found.gender || null, consentAt: new Date(),
    });
  } else {
    await recordFailure(String(user.id), "kyc");
  }
  await record(user.id, 1, status, checks, reason, status === "rejected" ? [] : photoDoc(found));
  await logAudit({ actorId: user.id, action: `kyc.tier1_${status}`, summary: `submitted BVN ••${bvn.slice(-4)} for Tier 1 (${status.replace("_", " ")})`, target: { type: "user", id: user.id }, details: checks });

  if (status === "approved") return { ok: true, status, message: "Your BVN is verified. You're now on Tier 1." };
  if (status === "pending_review") return { ok: true, status, message: "Thanks. Our team is checking your details and will update you within one working day." };
  return { ok: false, error: `${reason} Make sure your name on DigitMonie matches your bank records.` };
}

/* ---------- Tier 2: NIN + selfie ---------- */

export function parseImageDataUrl(dataUrl: string, maxBytes: number): { mimeType: string; data: string } | string {
  const m = dataUrl.match(/^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return "Take a photo or upload a JPG or PNG image.";
  if ((m[2].length * 3) / 4 > maxBytes) return `That image is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`;
  return { mimeType: m[1], data: m[2] };
}

export async function submitNinSelfie(user: CurrentUser, input: { nin: string; selfie: string }): Promise<KycOutcome> {
  const blocked = await guard(user, 2);
  if (blocked) return { ok: false, error: blocked };
  const nin = input.nin.replace(/\s/g, "");
  if (!/^\d{11}$/.test(nin)) return { ok: false, error: "Your NIN is 11 digits. Dial *346# to get it." };
  const selfie = parseImageDataUrl(input.selfie, 2 * 1024 * 1024);
  if (typeof selfie === "string") return { ok: false, error: selfie };

  const { profile } = await getKycState(user.id);
  if (!profile?.legalFirstName || !profile.dateOfBirth) return { ok: false, error: "Complete Tier 1 first." };
  const hash = idHash("nin", nin);
  if (await idTakenByOther("ninHash", hash, user.id)) {
    await record(user.id, 2, "rejected", { duplicate: true }, "This NIN is already linked to another DigitMonie account.");
    return { ok: false, error: "This NIN is already linked to another DigitMonie account. Contact support if that isn't you." };
  }

  const provider = await identityProvider().catch((e: Error) => e);
  if (provider instanceof Error) return providerFailure(new ProviderError(provider.message));
  const { faceAutoApprove, faceReview, nameMatch } = await kycThresholds();
  const legal = { firstName: profile.legalFirstName, lastName: profile.legalLastName ?? "" };
  let result;
  try {
    result = await provider.verifyNinSelfie(nin, selfie.data, { ...legal, dateOfBirth: profile.dateOfBirth });
  } catch (error) {
    return providerFailure(error);
  }
  if (!result) {
    await recordFailure(String(user.id), "kyc");
    return { ok: false, error: "We couldn't find that NIN. Check the number and try again." };
  }

  const checks: KycChecks = {
    provider: provider.name, faceScore: Math.round(result.confidence),
    nameScore: nameScore(legal, result.record), dobMatch: !result.record.dateOfBirth || result.record.dateOfBirth === profile.dateOfBirth,
  };
  let status: KycStatus;
  let reason: string | null = null;
  if (checks.faceScore! < faceReview) {
    status = "rejected";
    reason = "Your selfie didn't match the photo on your NIN.";
  } else if (checks.nameScore! < 50) {
    status = "rejected";
    reason = "The name on this NIN doesn't match your BVN.";
  } else if (checks.faceScore! >= faceAutoApprove && checks.nameScore! >= nameMatch && checks.dobMatch) {
    status = "approved";
  } else {
    status = "pending_review";
    reason = [checks.faceScore! < faceAutoApprove && `Face match ${checks.faceScore}%`, checks.nameScore! < nameMatch && "Name partly matches BVN", !checks.dobMatch && "Date of birth differs from BVN"].filter(Boolean).join(" · ");
  }

  if (status !== "rejected") {
    await saveProfile(user.id, { ninEncrypted: encryptSecret(nin), ninHash: hash, ninLast4: nin.slice(-4) });
  } else {
    await recordFailure(String(user.id), "kyc");
  }
  await record(user.id, 2, status, checks, reason, [{ kind: "selfie", ...selfie }, ...photoDoc(result.record)]);
  await logAudit({ actorId: user.id, action: `kyc.tier2_${status}`, summary: `submitted NIN ••${nin.slice(-4)} and a selfie for Tier 2 (${status.replace("_", " ")})`, target: { type: "user", id: user.id }, details: checks });

  if (status === "approved") return { ok: true, status, message: "Your NIN and selfie are verified. You're now on Tier 2." };
  if (status === "pending_review") return { ok: true, status, message: "Thanks. Our team is checking your selfie and will update you within one working day." };
  return { ok: false, error: `${reason} Retake your selfie facing the camera in good light, without glasses or a hat.` };
}

/* ---------- Tier 3: address ---------- */

export async function submitAddress(user: CurrentUser, input: { addressLine: string; city: string; state: string; document: string }): Promise<KycOutcome> {
  const blocked = await guard(user, 3);
  if (blocked) return { ok: false, error: blocked };
  const addressLine = input.addressLine.trim(), city = input.city.trim();
  if (addressLine.length < 8) return { ok: false, error: "Enter your full street address." };
  if (city.length < 2) return { ok: false, error: "Enter your city or town." };
  if (!NIGERIAN_STATES.includes(input.state)) return { ok: false, error: "Choose your state." };
  const m = input.document.match(/^data:(image\/jpeg|image\/png|application\/pdf);base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return { ok: false, error: "Upload a utility bill or bank statement as a JPG, PNG or PDF." };
  if ((m[2].length * 3) / 4 > 3 * 1024 * 1024) return { ok: false, error: "That file is too large (max 3 MB)." };

  await saveProfile(user.id, { addressLine, city, state: input.state });
  await record(user.id, 3, "pending_review", { notes: ["Proof of address needs a manual check"] }, "Check the document shows this name and address and is less than 3 months old.", [{ kind: "proof_of_address", mimeType: m[1], data: m[2] }]);
  await logAudit({ actorId: user.id, action: "kyc.tier3_pending_review", summary: "submitted proof of address for Tier 3", target: { type: "user", id: user.id } });
  return { ok: true, status: "pending_review", message: "Thanks. Our team will check your document within one working day." };
}

/* ---------- Staff decisions ---------- */

export async function decideSubmission(staff: CurrentUser, submissionId: number, decision: "approve" | "reject", reason: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDb();
  const [sub] = await db.select().from(kycSubmissions).where(eq(kycSubmissions.id, submissionId));
  if (!sub || sub.status !== "pending_review") return { ok: false, error: "This submission has already been decided." };
  if (decision === "reject" && reason.trim().length < 5) return { ok: false, error: "Tell the customer why (at least a few words)." };
  const [customer] = await db.select().from(users).where(eq(users.id, sub.userId));
  if (!customer) return { ok: false, error: "The customer no longer exists." };

  const status: KycStatus = decision === "approve" ? "approved" : "rejected";
  await db.update(kycSubmissions).set({ status, decidedBy: "manual", reviewedById: staff.id, reviewedAt: new Date(), reason: decision === "reject" ? reason.trim() : sub.reason }).where(eq(kycSubmissions.id, sub.id));

  if (status === "approved") {
    if (customer.kycTier >= sub.tier - 1) await db.update(users).set({ kycTier: Math.max(customer.kycTier, sub.tier) }).where(eq(users.id, customer.id));
  } else {
    // Free the BVN/NIN so the customer can try again with the right details.
    if (sub.tier === 1) await db.update(kycProfiles).set({ bvnEncrypted: null, bvnHash: null, bvnLast4: null, legalFirstName: null, legalMiddleName: null, legalLastName: null, dateOfBirth: null }).where(eq(kycProfiles.userId, customer.id));
    if (sub.tier === 2) await db.update(kycProfiles).set({ ninEncrypted: null, ninHash: null, ninLast4: null }).where(eq(kycProfiles.userId, customer.id));
  }

  await logAudit({
    actorId: staff.id, action: `kyc.${status === "approved" ? "approved" : "rejected"}`,
    summary: `${status === "approved" ? "approved" : "rejected"} Tier ${sub.tier} for ${customer.firstName} ${customer.lastName}${status === "rejected" ? `: ${reason.trim()}` : ""}`,
    target: { type: "kyc_submission", id: sub.id },
  });
  if (customer.phone) {
    await sendSms(customer.phone, status === "approved"
      ? `DigitMonie: your Tier ${sub.tier} verification is approved. Your new limits are active now.`
      : `DigitMonie: we couldn't approve your Tier ${sub.tier} verification. Open the app to see why and try again.`).catch(() => {});
  }
  return { ok: true };
}

export type { KycProfile, KycSubmission };
