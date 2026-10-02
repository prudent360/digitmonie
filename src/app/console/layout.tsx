import { AppShell, type NavItem } from "@/components/app/app-shell";
import { ChartIcon, ClockIcon, IdCardIcon, LandmarkIcon, ReceiptIcon, TrendUpIcon, UserCogIcon, UsersIcon } from "@/components/icons";
import { can, fullName, requirePermission } from "@/lib/auth";
import { pendingKycCount } from "@/lib/kyc/queries";
import { loanApplications } from "@/lib/mock-data";
import type { Permission } from "@/lib/permissions";

const ITEMS: (NavItem & { permission: Permission; group: "Overview" | "Operations" | "Administration" })[] = [
  { href: "/console", label: "Overview", icon: <ChartIcon />, permission: "console.access", group: "Overview" },
  { href: "/console/customers", label: "Customers", icon: <UsersIcon />, permission: "users.view", group: "Operations" },
  { href: "/console/kyc", label: "KYC reviews", icon: <IdCardIcon />, permission: "kyc.review", group: "Operations" },
  { href: "/console/loans", label: "Loan applications", icon: <LandmarkIcon />, permission: "loans.review", group: "Operations", badge: String(loanApplications.filter((l) => l.status === "pending").length) },
  { href: "/console/transactions", label: "Transactions", icon: <ReceiptIcon />, permission: "transactions.view", group: "Operations" },
  { href: "/console/products", label: "Products", icon: <TrendUpIcon />, permission: "investments.manage", group: "Administration" },
  { href: "/console/team", label: "Team & roles", icon: <UserCogIcon />, permission: "team.manage", group: "Administration" },
  { href: "/console/audit", label: "Audit log", icon: <ClockIcon />, permission: "audit.view", group: "Administration" },
];

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermission("console.access");
  const kycWaiting = can(user, "kyc.review") ? await pendingKycCount() : 0;
  const allowed = ITEMS.filter((item) => can(user, item.permission))
    .map((item) => (item.href === "/console/kyc" && kycWaiting ? { ...item, badge: String(kycWaiting) } : item));
  const groups = ["Overview", "Operations", "Administration"] as const;
  const sections = groups
    .map((g) => ({ title: g === "Overview" ? undefined : g, items: allowed.filter((i) => i.group === g).map(({ href, label, icon, badge }) => ({ href, label, icon, badge })) }))
    .filter((s) => s.items.length);

  return (
    <AppShell variant="console" sections={sections} user={{ name: fullName(user), email: user.email, roleLabel: user.role.name }}>
      {children}
    </AppShell>
  );
}
