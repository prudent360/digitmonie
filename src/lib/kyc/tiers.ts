// CBN tiered KYC. Limits follow the CBN tiered-account framework; confirm the exact figures
// with the partner bank before launch and change them here.

export type TierInfo = {
  tier: 1 | 2 | 3;
  name: string;
  needs: string;
  singleLimit: number;
  dailyLimit: number;
  /** null = no cap */
  maxBalance: number | null;
  review: "automatic" | "staff";
};

export const KYC_TIERS: TierInfo[] = [
  { tier: 1, name: "Tier 1", needs: "BVN and date of birth", singleLimit: 50_000, dailyLimit: 50_000, maxBalance: 300_000, review: "automatic" },
  { tier: 2, name: "Tier 2", needs: "NIN and a selfie", singleLimit: 100_000, dailyLimit: 200_000, maxBalance: 500_000, review: "automatic" },
  { tier: 3, name: "Tier 3", needs: "Home address and proof of address", singleLimit: 5_000_000, dailyLimit: 5_000_000, maxBalance: null, review: "staff" },
];

export const tierInfo = (tier: number) => KYC_TIERS.find((t) => t.tier === tier);

// Face and name match thresholds are set in Console → Settings → Identity verification (lib/kyc/index.ts).
