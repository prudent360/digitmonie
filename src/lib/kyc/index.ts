import "server-only";
import { dojahProvider } from "./dojah";
import type { IdentityProvider } from "./provider";
import { sandboxProvider } from "./sandbox";

/** KYC_PROVIDER=dojah uses Dojah; otherwise the test provider (refused in production). */
export function identityProvider(): IdentityProvider {
  if (process.env.KYC_PROVIDER === "dojah") return dojahProvider;
  if (process.env.NODE_ENV === "production" && process.env.KYC_ALLOW_SANDBOX !== "true") {
    throw new Error("No identity provider is configured. Set KYC_PROVIDER=dojah with DOJAH_APP_ID and DOJAH_SECRET_KEY.");
  }
  return sandboxProvider;
}
