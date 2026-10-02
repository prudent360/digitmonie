import type { Metadata } from "next";
import { NotificationList } from "@/components/app/notification-list";
import { requireCustomer } from "@/lib/auth";
import { listNotifications, markRead } from "@/lib/notifications";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireCustomer();
  const items = await listNotifications(user.id, 100);
  await markRead(user.id, "all");
  return <NotificationList items={items} />;
}
