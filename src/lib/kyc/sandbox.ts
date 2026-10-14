import "server-only";
import type { Applicant, IdentityProvider, IdentityRecord } from "./provider";

/**
 * Test provider for development and demos. It never contacts NIBSS or NIMC.
 *  BVN/NIN ending 0000 → not found
 *  BVN/NIN starting 1   → belongs to someone else ("John Doe")
 *  NIN ending 1         → face match 78 (goes to staff review)
 *  NIN ending 2         → face match 41 (rejected)
 *  anything else        → matches the applicant, face match 96
 */
function record(id: string, applicant: Applicant): IdentityRecord | null {
  if (id.endsWith("0000")) return null;
  const other = id.startsWith("1");
  return {
    firstName: other ? "John" : applicant.firstName,
    middleName: "",
    lastName: other ? "Doe" : applicant.lastName,
    dateOfBirth: other ? "1980-01-01" : applicant.dateOfBirth,
    gender: "",
    phone: "",
    photo: null,
    watchlisted: false,
  };
}

export const sandboxProvider: IdentityProvider = {
  name: "sandbox",
  async lookupBvn(bvn, applicant) {
    return record(bvn, applicant);
  },
  async lookupNin(nin, applicant) {
    return record(nin, applicant);
  },
  async verifyNinSelfie(nin, _selfie, applicant) {
    const found = record(nin, applicant);
    if (!found) return null;
    return { confidence: nin.endsWith("1") ? 78 : nin.endsWith("2") ? 41 : 96, record: found };
  },
};
