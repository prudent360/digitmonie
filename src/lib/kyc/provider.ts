import "server-only";

export type IdentityRecord = {
  firstName: string;
  middleName: string;
  lastName: string;
  /** YYYY-MM-DD, or "" if the provider didn't return one. */
  dateOfBirth: string;
  gender: string;
  phone: string;
  /** Base64 JPEG/PNG of the enrolment photo, when available. */
  photo: string | null;
  watchlisted: boolean;
};

export type SelfieResult = { record: IdentityRecord; confidence: number };

/** What the sandbox echoes back; real providers ignore it. */
export type Applicant = { firstName: string; lastName: string; dateOfBirth: string };

export interface IdentityProvider {
  name: string;
  /** null when the number doesn't exist. */
  lookupBvn(bvn: string, applicant: Applicant): Promise<IdentityRecord | null>;
  /** Looks up the NIN and compares the selfie with its photo. null when the NIN doesn't exist. */
  verifyNinSelfie(nin: string, selfieBase64: string, applicant: Applicant): Promise<SelfieResult | null>;
}

export class ProviderError extends Error {}

/** Accepts 1990-05-16, 16-05-1990, 16-May-1990 and similar; returns YYYY-MM-DD or "". */
export function normalizeDate(input: string | null | undefined): string {
  if (!input) return "";
  const s = input.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}
