"use server";

import { and, count, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { roles, users } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { fullName, loadUser, requirePermission, type CurrentUser } from "@/lib/auth";
import { sendTemplate } from "@/lib/email";
import { siteUrl } from "@/lib/messaging";
import { ADMIN_ROLE, PERMISSIONS, isPermission, type Permission } from "@/lib/permissions";
import { issueInviteToken } from "@/lib/tokens";
import type { FormState } from "./auth";

export type TeamState = (FormState & { inviteUrl?: string }) | undefined;

const PATH = "/console/team";

async function staffTarget(id: number, me: CurrentUser): Promise<CurrentUser | string> {
  const target = await loadUser(id);
  if (!target || target.role.kind !== "staff") return "That team member no longer exists.";
  if (target.id === me.id) return "You can't change your own account here.";
  return target;
}

/** Stops the platform being left without an active administrator. */
async function isLastAdmin(userId: number): Promise<boolean> {
  const [{ n }] = await (await getDb()).select({ n: count() }).from(users)
    .where(and(eq(users.roleKey, ADMIN_ROLE), eq(users.status, "active"), ne(users.id, userId)));
  return n === 0;
}

async function sendInvite(user: CurrentUser, invitedBy: CurrentUser): Promise<string> {
  const url = `${siteUrl()}/invite/${await issueInviteToken(user.id)}`;
  await sendTemplate(user.email, "staff_invite", { name: user.firstName, role: user.role.name, invitedBy: fullName(invitedBy), inviteUrl: url });
  return url;
}

/* ---------- Members ---------- */

const inviteSchema = z.object({
  firstName: z.string().trim().min(2, "Enter their first name.").max(60),
  lastName: z.string().trim().min(2, "Enter their last name.").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  roleKey: z.string().min(1, "Choose a role."),
});

export async function inviteStaff(_: TeamState, fd: FormData): Promise<TeamState> {
  const me = await requirePermission("team.manage");
  const raw = { firstName: String(fd.get("firstName") ?? ""), lastName: String(fd.get("lastName") ?? ""), email: String(fd.get("email") ?? ""), roleKey: String(fd.get("roleKey") ?? "") };
  const parsed = inviteSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: raw };

  const db = await getDb();
  const [role] = await db.select().from(roles).where(eq(roles.key, parsed.data.roleKey));
  if (!role || role.kind !== "staff") return { error: "Choose a staff role.", fields: raw };
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(sql`lower(${users.email})`, parsed.data.email));
  if (taken) return { error: "Someone already uses that email.", fields: raw };

  const [created] = await db.insert(users).values({
    firstName: parsed.data.firstName, lastName: parsed.data.lastName, email: parsed.data.email,
    roleKey: role.key, status: "pending", invitedById: me.id,
  }).returning({ id: users.id });
  const user = (await loadUser(created.id))!;
  const inviteUrl = await sendInvite(user, me);
  await logAudit({ actorId: me.id, action: "staff.invited", summary: `invited ${fullName(user)} (${user.email}) as ${role.name}`, target: { type: "user", id: user.id } });
  revalidatePath(PATH);
  return { notice: `Invitation sent to ${user.email}.`, inviteUrl };
}

export async function resendInvite(_: TeamState, fd: FormData): Promise<TeamState> {
  const me = await requirePermission("team.manage");
  const target = await staffTarget(Number(fd.get("userId")), me);
  if (typeof target === "string") return { error: target };
  if (target.status !== "pending") return { error: "They've already accepted their invitation." };
  const inviteUrl = await sendInvite(target, me);
  await logAudit({ actorId: me.id, action: "staff.invite_resent", summary: `resent the invitation to ${fullName(target)}`, target: { type: "user", id: target.id } });
  return { notice: "New invitation sent. The old link no longer works.", inviteUrl };
}

export async function changeStaffRole(_: TeamState, fd: FormData): Promise<TeamState> {
  const me = await requirePermission("team.manage");
  const target = await staffTarget(Number(fd.get("userId")), me);
  if (typeof target === "string") return { error: target };
  const roleKey = String(fd.get("roleKey") ?? "");
  if (roleKey === target.roleKey) return undefined;

  const db = await getDb();
  const [role] = await db.select().from(roles).where(eq(roles.key, roleKey));
  if (!role || role.kind !== "staff") return { error: "Choose a staff role." };
  if (target.roleKey === ADMIN_ROLE && (await isLastAdmin(target.id))) return { error: "They're the only active administrator. Make someone else an administrator first." };

  await db.update(users).set({ roleKey }).where(eq(users.id, target.id));
  await logAudit({ actorId: me.id, action: "staff.role_changed", summary: `changed ${fullName(target)}'s role from ${target.role.name} to ${role.name}`, target: { type: "user", id: target.id }, details: { from: target.roleKey, to: roleKey } });
  revalidatePath(PATH);
  return { notice: "Role updated." };
}

export async function setStaffActive(_: TeamState, fd: FormData): Promise<TeamState> {
  const me = await requirePermission("team.manage");
  const target = await staffTarget(Number(fd.get("userId")), me);
  if (typeof target === "string") return { error: target };
  const activate = fd.get("active") === "true";
  if (!activate && target.roleKey === ADMIN_ROLE && (await isLastAdmin(target.id))) return { error: "You can't deactivate the only active administrator." };

  // Deactivating also signs them out everywhere.
  await (await getDb()).update(users)
    .set(activate ? { status: target.passwordHash ? "active" : "pending" } : { status: "closed", sessionVersion: target.sessionVersion + 1 })
    .where(eq(users.id, target.id));
  await logAudit({ actorId: me.id, action: activate ? "staff.reactivated" : "staff.deactivated", summary: `${activate ? "reactivated" : "deactivated"} ${fullName(target)}`, target: { type: "user", id: target.id } });
  revalidatePath(PATH);
  return { notice: activate ? "Access restored." : "Access removed and signed out." };
}

export async function resetStaffTwoFactor(_: TeamState, fd: FormData): Promise<TeamState> {
  const me = await requirePermission("team.manage");
  const target = await staffTarget(Number(fd.get("userId")), me);
  if (typeof target === "string") return { error: target };
  await (await getDb()).update(users)
    .set({ totpSecret: null, totpEnabledAt: null, sessionVersion: target.sessionVersion + 1 })
    .where(eq(users.id, target.id));
  await logAudit({ actorId: me.id, action: "staff.two_factor_reset", summary: `reset two-factor sign-in for ${fullName(target)}`, target: { type: "user", id: target.id } });
  revalidatePath(PATH);
  return { notice: "Two-factor reset. They'll set it up again at their next sign-in." };
}

/* ---------- Roles ---------- */

/** Every staff role needs console access, or its members couldn't sign in. */
function withConsole(perms: Permission[]): Permission[] {
  return Array.from(new Set<Permission>(["console.access", ...perms])).sort((a, b) => PERMISSIONS.indexOf(a) - PERMISSIONS.indexOf(b));
}

/** Saves the whole permission matrix (one checkbox per role and permission). */
export async function saveRolePermissions(_: TeamState, fd: FormData): Promise<TeamState> {
  const me = await requirePermission("team.manage");
  const db = await getDb();
  const staffRoles = await db.select().from(roles).where(eq(roles.kind, "staff"));
  const changes: string[] = [];

  for (const role of staffRoles) {
    if (role.key === ADMIN_ROLE) continue;
    const next = withConsole(fd.getAll(`perm:${role.key}`).filter(isPermission));
    const added = next.filter((p) => !role.permissions.includes(p));
    const removed = role.permissions.filter((p) => !next.includes(p));
    if (!added.length && !removed.length) continue;
    await db.update(roles).set({ permissions: next }).where(eq(roles.key, role.key));
    await logAudit({
      actorId: me.id, action: "role.permissions_changed",
      summary: `changed ${role.name} permissions${added.length ? ` (+${added.join(", +")})` : ""}${removed.length ? ` (−${removed.join(", −")})` : ""}`,
      target: { type: "role", id: role.key }, details: { added, removed },
    });
    changes.push(role.name);
  }
  revalidatePath(PATH);
  return changes.length ? { notice: `Saved changes to ${changes.join(", ")}.` } : { notice: "No changes to save." };
}

export async function createRole(_: TeamState, fd: FormData): Promise<TeamState> {
  const me = await requirePermission("team.manage");
  const name = String(fd.get("name") ?? "").trim();
  const description = String(fd.get("description") ?? "").trim().slice(0, 200);
  const fields = { name, description };
  if (name.length < 2 || name.length > 40) return { error: "Give the role a name between 2 and 40 characters.", fields };
  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (!key) return { error: "Use letters or numbers in the name.", fields };

  const db = await getDb();
  const [clash] = await db.select({ key: roles.key }).from(roles).where(eq(roles.key, key));
  if (clash) return { error: "A role with that name already exists.", fields };
  const [template] = await db.select().from(roles).where(eq(roles.key, String(fd.get("copyFrom") ?? "")));
  const permissions = withConsole(template?.kind === "staff" && template.key !== ADMIN_ROLE ? template.permissions : []);

  await db.insert(roles).values({ key, name, description, kind: "staff", permissions });
  await logAudit({ actorId: me.id, action: "role.created", summary: `created the ${name} role${template ? ` (copied from ${template.name})` : ""}`, target: { type: "role", id: key } });
  revalidatePath(PATH);
  return { notice: `${name} created. Tick its permissions below and save.` };
}

export async function deleteRole(_: TeamState, fd: FormData): Promise<TeamState> {
  const me = await requirePermission("team.manage");
  const db = await getDb();
  const [role] = await db.select().from(roles).where(eq(roles.key, String(fd.get("roleKey") ?? "")));
  if (!role) return { error: "That role no longer exists." };
  if (role.system) return { error: "Built-in roles can't be deleted." };
  const [{ n }] = await db.select({ n: count() }).from(users).where(eq(users.roleKey, role.key));
  if (n > 0) return { error: `Move its ${n} member${n === 1 ? "" : "s"} to another role first.` };
  await db.delete(roles).where(eq(roles.key, role.key));
  await logAudit({ actorId: me.id, action: "role.deleted", summary: `deleted the ${role.name} role`, target: { type: "role", id: role.key } });
  revalidatePath(PATH);
  return { notice: `${role.name} deleted.` };
}
