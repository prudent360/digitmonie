import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

// Optimistic check only: bounce visitors without a valid session for the area. Pages and
// server actions still load the user from the database and check permissions (lib/auth.ts).
export async function proxy(request: NextRequest) {
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = request.nextUrl;
  const area = pathname.startsWith("/console") ? "staff" : "customer";
  if (!session) return NextResponse.redirect(new URL("/login", request.url));
  if (session.kind !== area) return NextResponse.redirect(new URL(session.kind === "staff" ? "/console" : "/dashboard", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/console/:path*"],
};
