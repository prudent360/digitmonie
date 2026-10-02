import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { loanProducts } from "@/db/schema";

/** What the public site can truthfully say about lending, read from the active loan products. */
export type LoanFacts = {
  /** Smallest and largest loan, in naira. */
  min: number;
  max: number;
  minTenor: number;
  maxTenor: number;
  /** Lowest monthly interest rate, as a percentage (3.5 = 3.5% a month). */
  lowestRate: number;
  /** Some loans can be approved without waiting for staff. */
  instant: boolean;
  processingFee: boolean;
};

export async function loanFacts(): Promise<LoanFacts | null> {
  const products = await (await getDb()).select().from(loanProducts).where(eq(loanProducts.active, true));
  if (!products.length) return null;
  const tenors = products.flatMap((p) => p.tenors);
  return {
    min: Math.min(...products.map((p) => p.minAmount)) / 100,
    max: Math.max(...products.map((p) => p.maxAmount)) / 100,
    minTenor: Math.min(...tenors),
    maxTenor: Math.max(...tenors),
    lowestRate: Math.min(...products.map((p) => p.monthlyRateBps)) / 100,
    instant: products.some((p) => p.autoApproveUpTo != null),
    processingFee: products.some((p) => p.processingFeeBps > 0),
  };
}

/** ₦50m, ₦300k, ₦9,500: short amounts for headlines. */
export function shortNaira(naira: number) {
  const trim = (n: number) => String(Number(n.toFixed(1)));
  if (naira >= 1_000_000) return `₦${trim(naira / 1_000_000)}m`;
  if (naira >= 10_000) return `₦${trim(naira / 1_000)}k`;
  return `₦${naira.toLocaleString("en-NG")}`;
}

export const months = (n: number) => `${n} month${n === 1 ? "" : "s"}`;
