import "server-only";
import { getSetting, getSettings } from "@/lib/settings";
import { dojahConfig, dojahProvider } from "./dojah";
import type { IdentityProvider, IdKind } from "./provider";
import { sandboxProvider } from "./sandbox";
import { KYC_TIERS, type Tier } from "./tiers";

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

/** Every tier with its name, description, starting loan limit (kobo) and score points from Console → Settings. */
export async function getTiers(): Promise<Tier[]> {
  const keys = KYC_TIERS.flatMap(({ tier: n }) => [`tier${n}Name`, `tier${n}Description`, `limitTier${n}`, `scoreTier${n}`]);
  const s = await getSettings(...keys);
  return KYC_TIERS.map((t) => ({
    ...t,
    name: String(s[`tier${t.tier}Name`] ?? "").trim() || `Tier ${t.tier}`,
    description: String(s[`tier${t.tier}Description`] ?? "").trim(),
    startingLimit: Math.round(Number(s[`limitTier${t.tier}`]) * 100),
    score: Number(s[`scoreTier${t.tier}`]),
  }));
}

/** Tier number → name, e.g. { 1: "Basic", 2: "Verified", 3: "Premium" }. */
export async function tierNames(): Promise<Record<number, string>> {
  return Object.fromEntries((await getTiers()).map((t) => [t.tier, t.name]));
}
