import { extendSession, sessionTiming } from "@/lib/auth";

const noStore = { "Cache-Control": "no-store" };

/** How long the current session has left, without extending it (lets other tabs sync). */
export async function GET() {
  const timing = await sessionTiming();
  return timing ? Response.json(timing, { headers: noStore }) : Response.json({ error: "signed_out" }, { status: 401, headers: noStore });
}

/** The user is active in the app: restart the idle clock. */
export async function POST() {
  const timing = await extendSession();
  return timing ? Response.json(timing, { headers: noStore }) : Response.json({ error: "signed_out" }, { status: 401, headers: noStore });
}
