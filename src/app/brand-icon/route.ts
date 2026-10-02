import { getBranding } from "@/lib/branding";

/**
 * The browser-tab and home-screen icon: the favicon uploaded in Settings → Branding, or the built-in mark.
 * A route (not an app/icon file) so a new upload shows up without a redeploy.
 */
export async function GET(request: Request) {
  const { faviconUrl } = await getBranding();
  return new Response(null, { status: 307, headers: { Location: new URL(faviconUrl ?? "/icon.svg", request.url).toString(), "Cache-Control": "public, max-age=300" } });
}
