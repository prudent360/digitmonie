// The three verification tiers. What each tier needs is fixed here; its name, description, starting
// loan limit and score points are set in Console → Settings → Verification tiers (lib/kyc/index.ts).

export type TierInfo = {
  tier: 1 | 2 | 3;
  needs: string;
  review: "automatic" | "staff";
};

export const KYC_TIERS: TierInfo[] = [
  { tier: 1, needs: "NIN or BVN and date of birth", review: "automatic" },
  { tier: 2, needs: "A selfie matched to your NIN", review: "automatic" },
  { tier: 3, needs: "Home address and proof of address", review: "staff" },
];

/** A tier with the settings admins control. `startingLimit` is in kobo. */
export type Tier = TierInfo & { name: string; description: string; startingLimit: number; score: number };

export const ID_LABEL = { nin: "NIN", bvn: "BVN" } as const;

/** What a tier asks for, given the IDs Tier 1 accepts (Console → Settings). */
export function tierNeeds(t: TierInfo, tier1Ids: ("bvn" | "nin")[]): string {
  return t.tier === 1 ? `${tier1Ids.map((k) => ID_LABEL[k]).join(" or ")} and date of birth` : t.needs;
}

// Face and name match thresholds are set in Console → Settings → Identity verification (lib/kyc/index.ts).
