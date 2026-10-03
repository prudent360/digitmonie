import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

// Optimistic check only: bounce visitors without a valid session for the area. Pages and
// server actions still load the user from the database and check permissions (lib/auth.ts).
export async function proxy(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(cookie);
  const { pathname, search } = request.nextUrl;
  const area = pathname.startsWith("/console") ? "staff" : "customer";
  if (!session) {
    // Send them to sign in, then back here. A cookie that no longer works means the session timed out.
    const login = new URL("/login", request.url);
    if (cookie) login.searchParams.set("expired", "1");
    login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  if (session.kind !== area) return NextResponse.redirect(new URL(session.kind === "staff" ? "/console" : "/dashboard", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/console/:path*"],
};
