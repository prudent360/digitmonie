import "server-only";
import { getSetting } from "@/lib/settings";
import { dojahConfig, dojahProvider } from "./dojah";
import type { IdentityProvider, IdKind } from "./provider";
import { sandboxProvider } from "./sandbox";

/** The provider chosen in Console → Settings. The test provider is refused in production. */
export async function identityProvider(): Promise<IdentityProvider> {
  if ((await getSetting("kycProvider")) === "dojah") {
    await dojahConfig(); // Missing keys are a set-up problem, not an outage.
    return dojahProvider;
  }
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

/** Which IDs customers can verify Tier 1 with, from Console → Settings. */
export async function tier1IdKinds(): Promise<IdKind[]> {
  const choice = await getSetting("tier1Id");
  return choice === "bvn" ? ["bvn"] : choice === "either" ? ["nin", "bvn"] : ["nin"];
}
