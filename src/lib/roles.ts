// Who can do what. Add new roles (e.g. "support", "risk", "finance") by listing them here
// and granting them permissions below; navigation and route guards read from this file.

export const ROLES = ["customer", "staff", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  staff: "Staff",
  admin: "Administrator",
};

export const PERMISSIONS = [
  "console.access",
  "users.view",
  "users.manage",
  "kyc.review",
  "loans.review",
  "loans.approve",
  "investments.manage",
  "transactions.view",
  "transactions.reverse",
  "team.manage",
  "settings.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  customer: [],
  staff: ["console.access", "users.view", "kyc.review", "loans.review", "transactions.view"],
  admin: PERMISSIONS,
};

export function can(role: Role, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
