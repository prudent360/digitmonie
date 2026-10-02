import { markBrokenPromises } from "@/lib/collections";
import { todayIso } from "@/lib/loans/math";
import { runReconciliation } from "@/lib/reconciliation";
import { recheckStalePayouts } from "@/lib/loans/payouts";
import { refreshInstalments, sendDueReminders } from "@/lib/loans/service";

/** Daily upkeep: overdue marking, late fees, reminders, stuck transfers, broken promises and reconciliation. Called by Vercel Cron with CRON_SECRET. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const { newlyOverdue } = await refreshInstalments();
  const reminders = await sendDueReminders();
  const payoutsRechecked = await recheckStalePayouts();
  const promisesChecked = await markBrokenPromises();
  const yesterday = new Date(Date.parse(`${todayIso()}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  const reconciliation = await runReconciliation(yesterday, null);
  return Response.json({ newlyOverdue, reminders, payoutsRechecked, promisesChecked, reconciliation });
}
