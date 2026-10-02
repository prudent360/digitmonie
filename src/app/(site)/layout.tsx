import { connection } from "next/server";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getBranding } from "@/lib/branding";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Logos, company details and products come from Settings, so render per request (never baked in at build).
  await connection();
  const b = await getBranding();
  const logos = { light: b.logoUrl, dark: b.logoDarkUrl };
  return (
    <>
      <SiteHeader logos={logos} />
      <main>{children}</main>
      <SiteFooter logos={logos} />
    </>
  );
}
