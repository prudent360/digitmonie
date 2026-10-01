import type { Metadata } from "next";
import { CheckIcon, PlusIcon } from "@/components/icons";
import { Avatar, Badge, Card, CardHeader, PageHeader, Table, buttonPrimary } from "@/components/ui";
import { team } from "@/lib/mock-data";
import { PERMISSIONS, ROLES, ROLE_LABELS, can } from "@/lib/roles";
import { requirePermission } from "@/lib/session";

export const metadata: Metadata = { title: "Team & roles" };

const PERMISSION_LABELS: Record<(typeof PERMISSIONS)[number], string> = {
  "console.access": "Access the console",
  "users.view": "View customers",
  "users.manage": "Freeze / edit customers",
  "kyc.review": "Review KYC",
  "loans.review": "Review loan applications",
  "loans.approve": "Approve & disburse loans",
  "investments.manage": "Manage products & rates",
  "transactions.view": "View transactions",
  "transactions.reverse": "Reverse transactions",
  "team.manage": "Manage team & roles",
  "settings.manage": "Platform settings",
};

export default async function TeamPage() {
  await requirePermission("team.manage");
  const staffRoles = ROLES.filter((r) => r !== "customer");

  return (
    <div className="space-y-6">
      <PageHeader title="Team & roles" subtitle="Invite staff and control what each role can do." actions={<button type="button" className={buttonPrimary}><PlusIcon className="size-4" /> Invite member</button>} />
      <Card>
        <Table head={["Member", "Role", "Last active", ""]}>
          {team.map((m) => (
            <tr key={m.id}>
              <td className="px-5 py-3.5"><div className="flex items-center gap-3"><Avatar name={m.name} /><div><p className="font-semibold text-ink">{m.name}</p><p className="text-xs text-muted">{m.email}</p></div></div></td>
              <td className="px-5 py-3.5"><Badge tone={m.role === "admin" ? "gold" : "brand"}>{ROLE_LABELS[m.role]}</Badge></td>
              <td className="px-5 py-3.5 text-body">{m.lastActive}</td>
              <td className="px-5 py-3.5 text-right"><button type="button" className="text-sm font-semibold text-brand">Edit</button></td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card>
        <CardHeader title="Permission matrix" subtitle="More roles (support, risk, finance…) can be added in lib/roles.ts" />
        <div className="mt-3">
          <Table head={["Permission", ...staffRoles.map((r) => ROLE_LABELS[r])]}>
            {PERMISSIONS.map((p) => (
              <tr key={p}>
                <td className="px-5 py-3 text-ink">{PERMISSION_LABELS[p]}</td>
                {staffRoles.map((r) => (
                  <td key={r} className="px-5 py-3">
                    {can(r, p) ? <span className="inline-flex size-6 items-center justify-center rounded-full bg-success-soft text-success"><CheckIcon className="size-3.5" /></span> : <span className="text-muted">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </Table>
        </div>
      </Card>
    </div>
  );
}
