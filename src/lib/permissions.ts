// Every capability the console checks. Roles (stored in the database) grant a subset of these;
// the built-in Administrator role always has all of them.

export const PERMISSIONS = [
  "console.access",
  "users.view",
  "users.manage",
  "users.view_as",
  "kyc.review",
  "loans.review",
  "loans.approve",
  "loans.collect",
  "investments.manage",
  "transactions.view",
  "transactions.reverse",
  "team.manage",
  "audit.view",
  "reports.view",
  "finance.manage",
  "settings.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_GROUPS: { title: string; items: { key: Permission; label: string; hint: string }[] }[] = [
  { title: "General", items: [
    { key: "console.access", label: "Access the console", hint: "Required for any staff work" },
    { key: "audit.view", label: "View audit log", hint: "See what every staff member has done" },
    { key: "reports.view", label: "View reports", hint: "Portfolio, collections and revenue reports, CSV exports" },
  ] },
  { title: "Customers", items: [
    { key: "users.view", label: "View customers", hint: "Profiles, balances and history" },
    { key: "users.manage", label: "Manage customers", hint: "Freeze, restrict, edit or delete accounts" },
    { key: "users.view_as", label: "View as customer", hint: "Open a customer's dashboard read-only, to help with support" },
    { key: "kyc.review", label: "Review KYC", hint: "Approve or reject identity documents" },
  ] },
  { title: "Lending", items: [
    { key: "loans.review", label: "Review loan applications", hint: "See applications and recommend a decision" },
    { key: "loans.approve", label: "Approve and disburse loans", hint: "Make the final decision (never on a loan you reviewed)" },
    { key: "loans.collect", label: "Repayments and collections", hint: "Record repayments, contact overdue borrowers, promises to pay" },
  ] },
  { title: "Money", items: [
    { key: "transactions.view", label: "View transactions", hint: "Platform-wide activity and AML flags" },
    { key: "transactions.reverse", label: "Reverse transactions", hint: "Undo a completed transaction" },
    { key: "investments.manage", label: "Manage products", hint: "Loan and investment products, rates and fees" },
    { key: "finance.manage", label: "Finance", hint: "Reconciliation, record funding, resolve mismatches" },
  ] },
  { title: "Administration", items: [
    { key: "team.manage", label: "Manage team and roles", hint: "Invite staff and change what roles can do" },
    { key: "settings.manage", label: "Platform settings", hint: "Integrations and configuration" },
  ] },
];

export const ADMIN_ROLE = "admin";
export const CUSTOMER_ROLE = "customer";
export const DEFAULT_STAFF_ROLE = "staff";

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && (PERMISSIONS as readonly string[]).includes(value);
}
