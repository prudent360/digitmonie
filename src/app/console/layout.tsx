import { AppShell, type NavItem } from "@/components/app/app-shell";
import { ChartIcon, IdCardIcon, LandmarkIcon, ReceiptIcon, TrendUpIcon, UserCogIcon, UsersIcon } from "@/components/icons";
import { kycQueue, loanApplications } from "@/lib/mock-data";
import { ROLE_LABELS, can, type Permission } from "@/lib/roles";
import { requirePermission } from "@/lib/session";

const ITEMS: (NavItem & { permission: Permission; group: "Overview" | "Operations" | "Administration" })[] = [
  { href: "/console", label: "Overview", icon: <ChartIcon />, permission: "console.access", group: "Overview" },
  { href: "/console/customers", label: "Customers", icon: <UsersIcon />, permission: "users.view", group: "Operations" },
  { href: "/console/kyc", label: "KYC reviews", icon: <IdCardIcon />, permission: "kyc.review", group: "Operations", badge: String(kycQueue.length) },
  { href: "/console/loans", label: "Loan applications", icon: <LandmarkIcon />, permission: "loans.review", group: "Operations", badge: String(loanApplications.filter((l) => l.status === "pending").length) },
  { href: "/console/transactions", label: "Transactions", icon: <ReceiptIcon />, permission: "transactions.view", group: "Operations" },
  { href: "/console/products", label: "Investment products", icon: <TrendUpIcon />, permission: "investments.manage", group: "Administration" },
  { href: "/console/team", label: "Team & roles", icon: <UserCogIcon />, permission: "team.manage", group: "Administration" },
];

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePermission("console.access");
  const allowed = ITEMS.filter((item) => can(session.role, item.permission));
  const groups = ["Overview", "Operations", "Administration"] as const;
  const sections = groups
    .map((g) => ({ title: g === "Overview" ? undefined : g, items: allowed.filter((i) => i.group === g).map(({ href, label, icon, badge }) => ({ href, label, icon, badge })) }))
    .filter((s) => s.items.length);

  return (
    <AppShell variant="console" sections={sections} user={{ name: session.name, email: session.email, roleLabel: ROLE_LABELS[session.role] }} switchLink={{ href: "/dashboard", label: "View customer app" }}>
      {children}
    </AppShell>
  );
}
