import "server-only";
import type { IdentityProvider } from "./provider";

/**
 * Test provider for development and demos. It never contacts NIBSS or NIMC.
 *  BVN/NIN ending 0000 → not found
 *  BVN/NIN starting 1   → belongs to someone else ("John Doe")
 *  NIN ending 1         → face match 78 (goes to staff review)
 *  NIN ending 2         → face match 41 (rejected)
 *  anything else        → matches the applicant, face match 96
 */
export const sandboxProvider: IdentityProvider = {
  name: "sandbox",
  async lookupBvn(bvn, applicant) {
    if (bvn.endsWith("0000")) return null;
    const other = bvn.startsWith("1");
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
  },
  async verifyNinSelfie(nin, _selfie, applicant) {
    if (nin.endsWith("0000")) return null;
    const other = nin.startsWith("1");
    const confidence = nin.endsWith("1") ? 78 : nin.endsWith("2") ? 41 : 96;
    return {
      confidence,
      record: {
        firstName: other ? "John" : applicant.firstName,
        middleName: "",
        lastName: other ? "Doe" : applicant.lastName,
        dateOfBirth: other ? "1980-01-01" : applicant.dateOfBirth,
        gender: "",
        phone: "",
        photo: null,
        watchlisted: false,
      },
    };
  },
};
