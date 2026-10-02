import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { Notification } from "@/db/schema";

/** Full notification history. Opening the page marks them as read. */
export function NotificationList({ items }: { items: Notification[] }) {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Notifications" subtitle="Your latest 100 updates." />
      <Card>
        {items.length ? (
          <ul className="divide-y divide-line">
            {items.map((n) => {
              const inner = (
                <>
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-brand"}`} />
                  <span className="flex-1">
                    <span className={`block text-sm ${n.readAt ? "text-body" : "font-semibold text-ink"}`}>{n.title}</span>
                    {n.body && <span className="mt-0.5 block text-sm text-muted">{n.body}</span>}
                  </span>
                  <span className="whitespace-nowrap text-xs text-muted">{formatDate(n.createdAt.toISOString(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </>
              );
              return <li key={n.id}>{n.href ? <Link href={n.href} className="flex gap-3 px-5 py-4 hover:bg-canvas">{inner}</Link> : <div className="flex gap-3 px-5 py-4">{inner}</div>}</li>;
            })}
          </ul>
        ) : <p className="p-12 text-center text-sm text-muted">Nothing yet.</p>}
      </Card>
    </div>
  );
}
