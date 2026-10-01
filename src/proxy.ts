import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: send signed-out visitors to /login. Pages still verify the session
// and permissions themselves (see lib/session.ts).
export function proxy(request: NextRequest) {
  if (!request.cookies.has("dm_demo_role")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/console/:path*"],
};
