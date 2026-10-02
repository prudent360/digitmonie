import { connection } from "next/server";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getLogos } from "@/lib/branding";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Logos, company details and products come from Settings, so render per request (never baked in at build).
  await connection();
  const logos = await getLogos();
  return (
    <>
      <SiteHeader logos={logos} />
      <main>{children}</main>
      <SiteFooter logos={logos} />
    </>
  );
}
