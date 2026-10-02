import "server-only";
import { getSetting } from "@/lib/settings";
import { dojahProvider } from "./dojah";
import type { IdentityProvider } from "./provider";
import { sandboxProvider } from "./sandbox";

/** The provider chosen in Console → Settings. The test provider is refused in production. */
export async function identityProvider(): Promise<IdentityProvider> {
  if ((await getSetting("kycProvider")) === "dojah") return dojahProvider;
  if (process.env.NODE_ENV === "production" && process.env.KYC_ALLOW_SANDBOX !== "true") {
    throw new Error("No identity provider is configured. Choose Dojah in Console → Settings → Identity verification.");
  }
  return sandboxProvider;
}

/** Match thresholds from Console → Settings. */
export async function kycThresholds() {
  const [faceAutoApprove, faceReview, nameMatch] = await Promise.all([getSetting<number>("faceAutoApprove"), getSetting<number>("faceReview"), getSetting<number>("nameMatch")]);
  return { faceAutoApprove, faceReview, nameMatch };
}
