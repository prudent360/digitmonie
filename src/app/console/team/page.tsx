import type { Metadata } from "next";
import { asc, count, eq } from "drizzle-orm";
import { changeStaffRole, createRole, deleteRole, inviteStaff, resendInvite, resetStaffTwoFactor, saveRolePermissions, setStaffActive } from "@/app/actions/team";
import { CreateRoleForm, InviteForm, PermissionMatrix, RoleSelect, RowAction } from "@/components/app/team-forms";
import { Avatar, Badge, Card, CardHeader, PageHeader, Table } from "@/components/ui";
import { getDb } from "@/db";
import { roles, users } from "@/db/schema";
import { fullName, requirePermission } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { ADMIN_ROLE, PERMISSION_GROUPS } from "@/lib/permissions";

export const metadata: Metadata = { title: "Team & roles" };

const STATUS = {
  active: { tone: "success", label: "Active" },
  pending: { tone: "warning", label: "Invited" },
  closed: { tone: "neutral", label: "Deactivated" },
} as const;

export default async function TeamPage() {
  const me = await requirePermission("team.manage");
  const db = await getDb();

  const staffRoles = await db.select().from(roles).where(eq(roles.kind, "staff")).orderBy(asc(roles.createdAt));
  // Administrator first, then built-in, then custom roles.
  staffRoles.sort((a, b) => Number(b.key === ADMIN_ROLE) - Number(a.key === ADMIN_ROLE) || Number(b.system) - Number(a.system));
  const memberCounts = await db.select({ roleKey: users.roleKey, n: count() }).from(users).groupBy(users.roleKey);
  const membersOf = (key: string) => memberCounts.find((m) => m.roleKey === key)?.n ?? 0;

  const staff = await db.select({ u: users, roleName: roles.name }).from(users)
    .innerJoin(roles, eq(roles.key, users.roleKey)).where(eq(roles.kind, "staff")).orderBy(asc(users.createdAt));
  const roleOptions = staffRoles.map((r) => ({ key: r.key, name: r.name }));
  const customRoles = staffRoles.filter((r) => !r.system);

  return (
    <div className="space-y-6">
      <PageHeader title="Team & roles" subtitle="Invite staff, choose their roles and control what each role can do." />

      <Card>
          <CardHeader title="Team members" subtitle={`${staff.length} people with console access`} />
          <div className="mt-3">
            <Table head={["Member", "Role", "Status", "2FA", "Last sign-in", ""]}>
              {staff.map(({ u, roleName }) => {
                const self = u.id === me.id;
                const status = STATUS[u.status as keyof typeof STATUS] ?? STATUS.active;
                return (
                  <tr key={u.id} className="align-top">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={fullName(u)} />
                        <div><p className="font-semibold text-ink">{fullName(u)} {self && <Badge tone="brand">You</Badge>}</p><p className="text-xs text-muted">{u.email}</p></div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {self || u.status === "closed" ? <span className="font-semibold text-ink">{roleName}</span> : <RoleSelect action={changeStaffRole} userId={u.id} current={u.roleKey} roles={roleOptions} />}
                    </td>
                    <td className="px-5 py-3.5"><Badge tone={status.tone} dot>{status.label}</Badge></td>
                    <td className="px-5 py-3.5">{u.totpEnabledAt ? <Badge tone="success">On</Badge> : <Badge tone="neutral">Not set</Badge>}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-body">{u.lastLoginAt ? formatDate(u.lastLoginAt.toISOString(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never"}</td>
                    <td className="px-5 py-3.5">
                      {!self && (
                        <div className="flex flex-col items-end gap-2">
                          {u.status === "pending" && <RowAction action={resendInvite} fields={{ userId: String(u.id) }} label="Resend invite" />}
                          {u.status === "active" && u.totpEnabledAt && <RowAction action={resetStaffTwoFactor} fields={{ userId: String(u.id) }} label="Reset 2FA" confirm={`Reset two-factor sign-in for ${fullName(u)}? They'll be signed out and must set it up again.`} />}
                          {u.status === "closed"
                            ? <RowAction action={setStaffActive} fields={{ userId: String(u.id), active: "true" }} label="Reactivate" />
                            : <RowAction action={setStaffActive} fields={{ userId: String(u.id), active: "false" }} label="Deactivate" tone="danger" confirm={`Remove ${fullName(u)}'s access? They'll be signed out immediately.`} />}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Table>
          </div>
        </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-[15px] font-bold text-ink">Invite a team member</h2>
          <p className="mt-1 text-xs text-muted">They&apos;ll get an email to set a password, then set up two-factor sign-in.</p>
          <div className="mt-5"><InviteForm action={inviteStaff} roles={roleOptions} /></div>
        </Card>
        <Card className="p-5">
          <h2 className="text-[15px] font-bold text-ink">Create a role</h2>
          <p className="mt-1 text-xs text-muted">For example Customer support, Risk analyst, Finance or Collections.</p>
          <div className="mt-5"><CreateRoleForm action={createRole} roles={roleOptions.filter((r) => r.key !== ADMIN_ROLE)} /></div>
          {customRoles.length > 0 && (
            <div className="mt-6 border-t border-line pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Custom roles</p>
              <ul className="mt-2 divide-y divide-line">
                {customRoles.map((r) => (
                  <li key={r.key} className="flex items-start justify-between gap-4 py-3">
                    <div><p className="font-semibold text-ink">{r.name}</p><p className="text-xs text-muted">{r.description || "No description"} · {membersOf(r.key)} member{membersOf(r.key) === 1 ? "" : "s"}</p></div>
                    <RowAction action={deleteRole} fields={{ roleKey: r.key }} label="Delete" tone="danger" confirm={`Delete the ${r.name} role?`} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader title="What each role can do" subtitle="Administrators always have every permission. Everyone needs console access to sign in." />
        <div className="mt-3">
          <PermissionMatrix
            action={saveRolePermissions}
            groups={PERMISSION_GROUPS}
            roles={staffRoles.map((r) => ({ key: r.key, name: r.name, permissions: r.permissions, locked: r.key === ADMIN_ROLE, members: membersOf(r.key) }))}
          />
        </div>
      </Card>

    </div>
  );
}
