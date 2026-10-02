import "server-only";
import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { notifications, roles, users } from "@/db/schema";
import { renderEmail } from "./email-template";
import { sendEmail, sendSms, siteUrl } from "./messaging";
import { ADMIN_ROLE, type Permission } from "./permissions";

type Message = { category: string; title: string; body: string; href?: string };

/**
 * Tells a customer something: always in the app, plus SMS and/or email when asked.
 * `sms` is the text message (keep it short); email reuses the title and body.
 */
export async function notifyCustomer(userId: number, msg: Message & { sms?: string; email?: boolean; ctaLabel?: string }) {
  const db = await getDb();
  await db.insert(notifications).values({ userId, category: msg.category, title: msg.title, body: msg.body, href: msg.href ?? null });
  if (!msg.sms && !msg.email) return;
  const [u] = await db.select({ phone: users.phone, email: users.email, firstName: users.firstName }).from(users).where(eq(users.id, userId));
  if (!u) return;
  if (msg.sms && u.phone) await sendSms(u.phone, `DigitMonie: ${msg.sms}`).catch((e) => console.error("[notify] sms failed", e));
  if (msg.email) {
    const url = msg.href ? `${siteUrl()}${msg.href}` : `${siteUrl()}/dashboard`;
    await sendEmail({
      to: u.email, subject: msg.title,
      text: `Hi ${u.firstName},\n\n${msg.body}\n\n${url}`,
      html: renderEmail({ title: msg.title, body: `Hi ${u.firstName},\n\n${msg.body}`, ctaLabel: msg.ctaLabel ?? "Open DigitMonie", ctaUrl: url }),
    }).catch((e) => console.error("[notify] email failed", e));
  }
}

/** In-app alert to every active staff member whose role has `permission` (administrators always). */
export async function notifyStaff(permission: Permission, msg: Message) {
  const db = await getDb();
  const staff = await db.select({ id: users.id, roleKey: users.roleKey, permissions: roles.permissions })
    .from(users).innerJoin(roles, eq(roles.key, users.roleKey))
    .where(and(eq(roles.kind, "staff"), eq(users.status, "active")));
  const targets = staff.filter((s) => s.roleKey === ADMIN_ROLE || s.permissions.includes(permission)).map((s) => s.id);
  if (targets.length) await db.insert(notifications).values(targets.map((userId) => ({ userId, category: msg.category, title: msg.title, body: msg.body, href: msg.href ?? null })));
}

export async function listNotifications(userId: number, limit = 20) {
  return (await getDb()).select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt), desc(notifications.id)).limit(limit);
}

export async function unreadCount(userId: number): Promise<number> {
  const [{ n }] = await (await getDb()).select({ n: count() }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return n;
}

export async function markRead(userId: number, ids: number[] | "all") {
  const db = await getDb();
  const mine = and(eq(notifications.userId, userId), isNull(notifications.readAt));
  await db.update(notifications).set({ readAt: new Date() }).where(ids === "all" ? mine : and(mine, inArray(notifications.id, ids)));
}
