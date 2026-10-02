import "server-only";
import { normalizeDate, ProviderError, type IdentityProvider, type IdentityRecord } from "./provider";

// Dojah (https://docs.dojah.io). Set DOJAH_APP_ID and DOJAH_SECRET_KEY; DOJAH_ENV=live for production,
// anything else uses the Dojah sandbox (test BVN 22222222222).
function config() {
  const appId = process.env.DOJAH_APP_ID;
  const secret = process.env.DOJAH_SECRET_KEY;
  if (!appId || !secret) throw new ProviderError("Dojah keys are not configured.");
  const base = process.env.DOJAH_ENV === "live" ? "https://api.dojah.io" : "https://sandbox.dojah.io";
  return { base, headers: { AppId: appId, Authorization: secret, "Content-Type": "application/json" } };
}

type Entity = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function toRecord(e: Entity): IdentityRecord {
  const photo = s(e.image) || s(e.photo);
  return {
    firstName: s(e.first_name) || s(e.firstname),
    middleName: s(e.middle_name) || s(e.middlename),
    lastName: s(e.last_name) || s(e.surname) || s(e.lastname),
    dateOfBirth: normalizeDate(s(e.date_of_birth) || s(e.birthdate)),
    gender: s(e.gender),
    phone: s(e.phone_number1) || s(e.phone_number) || s(e.telephoneno),
    photo: photo ? photo.replace(/^data:image\/\w+;base64,/, "") : null,
    watchlisted: String(e.watch_listed ?? "").toUpperCase() === "YES",
  };
}

async function call(path: string, init?: RequestInit): Promise<Entity | null> {
  const { base, headers } = config();
  const res = await fetch(`${base}${path}`, { ...init, headers, cache: "no-store" });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new ProviderError(`Dojah responded ${res.status}`);
  const body = (await res.json()) as { entity?: Entity };
  return body.entity ?? null;
}

export const dojahProvider: IdentityProvider = {
  name: "dojah",
  async lookupBvn(bvn) {
    const entity = await call(`/api/v1/kyc/bvn/full?bvn=${encodeURIComponent(bvn)}`);
    return entity ? toRecord(entity) : null;
  },
  async verifyNinSelfie(nin, selfieBase64) {
    // Threshold 50 so we always get the score back; our own thresholds decide (lib/kyc/tiers.ts).
    const entity = await call("/api/v1/kyc/nin/verify", { method: "POST", body: JSON.stringify({ nin, selfie_image: selfieBase64, threshold: 50 }) });
    if (!entity) return null;
    const sv = (entity.selfie_verification ?? {}) as { confidence_value?: number };
    return { record: toRecord(entity), confidence: Number(sv.confidence_value ?? 0) };
  },
};
