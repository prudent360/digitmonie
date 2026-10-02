import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { loanProducts } from "@/db/schema";
import { emailConfig } from "./email";
import { siteUrl } from "./messaging";
import { sessionSecretProblem } from "./session-token";
import { getSettings } from "./settings";
import { blobConfigured } from "./storage";

export type Check = { label: string; ok: boolean; /** What to do when it isn't. */ fix: string; href?: string };

/** What must be true before real customers use the site. Shown to admins on the console overview. */
export async function launchChecklist(): Promise<Check[]> {
  const s = await getSettings(
    "flwSecretKey", "flwWebhookHash", "repaymentProvider", "paystackSecretKey", "kycProvider", "dojahEnv", "dojahAppId", "dojahSecretKey",
    "legalName", "rcNumber", "companyAddress", "fccpcLicence", "dpoEmail",
  );
  const str = (k: keyof typeof s) => String(s[k] ?? "").trim();
  const site = siteUrl();
  const email = await emailConfig();
  const [product] = await (await getDb()).select({ id: loanProducts.id }).from(loanProducts).where(eq(loanProducts.active, true)).limit(1);
  const flwKey = str("flwSecretKey");
  const missingCompany = [["legal name", "legalName"], ["RC number", "rcNumber"], ["address", "companyAddress"], ["FCCPC licence number", "fccpcLicence"], ["data protection email", "dpoEmail"]]
    .filter(([, k]) => !str(k as keyof typeof s)).map(([label]) => label);

  return [
    { label: "Production database", ok: Boolean(process.env.DATABASE_URL), fix: "Set DATABASE_URL (your Neon connection string) in Vercel → Settings → Environment Variables, then redeploy." },
    { label: "Session secret", ok: !sessionSecretProblem(), fix: "Set SESSION_SECRET to a random value of at least 32 characters (openssl rand -base64 32) in Vercel, then redeploy." },
    { label: "Site address", ok: site.startsWith("https://") && !site.includes("localhost") && !site.endsWith(".vercel.app"), fix: `Set NEXT_PUBLIC_SITE_URL to https://digitmonie.com in Vercel, then redeploy. Links in emails currently use ${site}.` },
    { label: "File uploads (logos)", ok: blobConfigured() || !process.env.VERCEL, fix: "Connect a Blob store in Vercel → Storage → Create → Blob, connect it to this project, then redeploy." },
    { label: "Daily loan jobs", ok: Boolean(process.env.CRON_SECRET), fix: "Set CRON_SECRET in Vercel. Without it, overdue marking, reminders and reconciliation don't run." },
    { label: "Email sending", ok: email.ready && email.driver !== "log", fix: "Add a Resend API key or SMTP details. Sign-in codes are sent by email.", href: "/console/settings?tab=email" },
    { label: "Flutterwave live keys", ok: Boolean(flwKey) && !/TEST/i.test(flwKey), fix: flwKey ? "You're using Flutterwave test keys. Replace them with your live keys." : "Add your Flutterwave live secret key.", href: "/console/settings?tab=flutterwave" },
    { label: "Flutterwave webhook", ok: Boolean(str("flwWebhookHash")), fix: "Set a webhook secret hash, and the same value in Flutterwave → Settings → Webhooks.", href: "/console/settings?tab=flutterwave" },
    ...(str("repaymentProvider") === "paystack" ? [{ label: "Paystack key", ok: Boolean(str("paystackSecretKey")) && !str("paystackSecretKey").startsWith("sk_test"), fix: "Repayments use Paystack: add your live Paystack secret key.", href: "/console/settings?tab=payments" }] : []),
    { label: "Identity checks (Dojah live)", ok: str("kycProvider") === "dojah" && str("dojahEnv") === "live" && Boolean(str("dojahAppId") && str("dojahSecretKey")), fix: "Choose Dojah, enter your app ID and secret key, and set the environment to Live.", href: "/console/settings?tab=kyc" },
    ...(process.env.KYC_ALLOW_SANDBOX === "true" ? [{ label: "Test identity checks switched off", ok: false, fix: "KYC_ALLOW_SANDBOX is on, so anyone can pass BVN and NIN checks with made-up numbers. Remove it in Vercel and redeploy before real customers sign up." }] : []),
    { label: "Company details", ok: !missingCompany.length, fix: `Add your ${missingCompany.join(", ")}. They appear in the footer and legal pages.`, href: "/console/settings?tab=general" },
    { label: "A loan product on offer", ok: Boolean(product), fix: "Offer at least one loan product, with your real rates and limits.", href: "/console/products" },
  ];
}
