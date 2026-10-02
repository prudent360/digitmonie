import "server-only";
import { getSettings } from "./settings";

/** Company details for the legal pages, from Console → Settings → General. */
export async function legalDetails() {
  const s = await getSettings("legalName", "rcNumber", "companyAddress", "supportEmail", "supportPhone", "fccpcLicence", "dpoEmail");
  const str = (v: unknown) => String(v ?? "").trim();
  return {
    company: str(s.legalName) || "DigitMonie Limited",
    rc: str(s.rcNumber),
    address: str(s.companyAddress),
    email: str(s.supportEmail) || "hello@digitmonie.com",
    phone: str(s.supportPhone),
    licence: str(s.fccpcLicence),
    dpo: str(s.dpoEmail) || str(s.supportEmail) || "privacy@digitmonie.com",
  };
}

export const LEGAL_UPDATED = "2 October 2026";
