"use server";

import { getCurrentUser, viewingAs } from "@/lib/auth";
import { listNotifications, markRead, unreadCount } from "@/lib/notifications";

export type BellItem = { id: number; title: string; body: string; href: string | null; read: boolean; at: string };

export async function bellData(): Promise<{ unread: number; items: BellItem[] }> {
  const user = await getCurrentUser();
  if (!user) return { unread: 0, items: [] };
  const [items, unread] = await Promise.all([listNotifications(user.id, 12), unreadCount(user.id)]);
  return { unread, items: items.map((n) => ({ id: n.id, title: n.title, body: n.body, href: n.href, read: Boolean(n.readAt), at: n.createdAt.toISOString() })) };
}

export async function unreadOnly(): Promise<number> {
  const user = await getCurrentUser();
  return user ? unreadCount(user.id) : 0;
}

export async function markNotificationsRead(ids: number[] | "all") {
  const user = await getCurrentUser();
  // Staff viewing the account mustn't mark the customer's messages as read.
  if (user && !(await viewingAs())) await markRead(user.id, ids);
}
