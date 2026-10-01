import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { can, isRole, type Permission, type Role } from "@/lib/roles";

// DEMO ONLY: the session is an unsigned cookie naming a role, so the UI can be explored
// as each role. Replace with real authentication (signed session + database) before launch.
export const SESSION_COOKIE = "dm_demo_role";

export type Session = { role: Role; name: string; email: string };

const DEMO_PEOPLE: Record<Role, Omit<Session, "role">> = {
  customer: { name: "Adaeze Okafor", email: "adaeze@example.com" },
  staff: { name: "Tunde Bakare", email: "tunde@digitmonie.com" },
  admin: { name: "Ifiok Udo", email: "admin@digitmonie.com" },
};

export async function getSession(): Promise<Session | null> {
  const role = (await cookies()).get(SESSION_COOKIE)?.value;
  return isRole(role) ? { role, ...DEMO_PEOPLE[role] } : null;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireSession();
  if (!can(session.role, permission)) redirect("/dashboard");
  return session;
}
