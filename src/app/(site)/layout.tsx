import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getBranding } from "@/lib/branding";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
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
