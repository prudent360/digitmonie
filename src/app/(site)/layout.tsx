import { connection } from "next/server";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getLogos } from "@/lib/branding";
import { legalDetails } from "@/lib/legal";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Logos, company details and products come from Settings, so render per request (never baked in at build).
  await connection();
  const [logos, company] = await Promise.all([getLogos(), legalDetails()]);
  return (
    <>
      <SiteHeader logos={logos} />
      <main>{children}</main>
      <SiteFooter logos={logos} company={company} />
    </>
  );
}
