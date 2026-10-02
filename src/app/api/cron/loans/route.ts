import { refreshInstalments, sendDueReminders } from "@/lib/loans/service";

/** Daily loan upkeep: overdue marking, late fees and reminders. Called by Vercel Cron with CRON_SECRET. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const { newlyOverdue } = await refreshInstalments();
  const reminders = await sendDueReminders();
  return Response.json({ newlyOverdue, reminders });
}
