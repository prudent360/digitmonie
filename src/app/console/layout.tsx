import { unreadCount } from "@/lib/notifications";
import { getLogos } from "@/lib/branding";
import { SessionWatch } from "@/components/app/session-watch";
import { AppShell, type NavItem } from "@/components/app/app-shell";
import { AlertIcon, ChartIcon, CheckIcon, ClockIcon, SettingsIcon, IdCardIcon, LandmarkIcon, ReceiptIcon, TrendUpIcon, UserCogIcon, UsersIcon } from "@/components/icons";
import { can, fullName, requirePermission, sessionTiming } from "@/lib/auth";
import { pendingKycCount } from "@/lib/kyc/queries";
import { loanQueueCounts } from "@/lib/loans/queries";
import type { Permission } from "@/lib/permissions";

const ITEMS: (NavItem & { permission: Permission; group: "Overview" | "Operations" | "Administration" })[] = [
  { href: "/console", label: "Overview", icon: <ChartIcon />, permission: "console.access", group: "Overview" },
  { href: "/console/customers", label: "Customers", icon: <UsersIcon />, permission: "users.view", group: "Operations" },
  { href: "/console/kyc", label: "KYC reviews", icon: <IdCardIcon />, permission: "kyc.review", group: "Operations" },
  { href: "/console/loans", label: "Loans", icon: <LandmarkIcon />, permission: "loans.review", group: "Operations" },
  { href: "/console/reconciliation", label: "Reconciliation", icon: <CheckIcon />, permission: "transactions.view", group: "Operations" },
  { href: "/console/collections", label: "Collections", icon: <AlertIcon />, permission: "loans.collect", group: "Operations" },
  { href: "/console/transactions", label: "Money", icon: <ReceiptIcon />, permission: "transactions.view", group: "Operations" },
  { href: "/console/reports", label: "Reports", icon: <ChartIcon />, permission: "reports.view", group: "Administration" },
  { href: "/console/products", label: "Products", icon: <TrendUpIcon />, permission: "investments.manage", group: "Administration" },
  { href: "/console/team", label: "Team & roles", icon: <UserCogIcon />, permission: "team.manage", group: "Administration" },
  { href: "/console/audit", label: "Audit log", icon: <ClockIcon />, permission: "audit.view", group: "Administration" },
  { href: "/console/settings", label: "Settings", icon: <SettingsIcon />, permission: "settings.manage", group: "Administration" },
];

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePermission("console.access");
  const timing = await sessionTiming();
  const kycWaiting = can(user, "kyc.review") ? await pendingKycCount() : 0;
  const loanCounts = can(user, "loans.review") || can(user, "loans.collect") ? await loanQueueCounts() : null;
  const loansWaiting = loanCounts ? loanCounts.review + (can(user, "loans.approve") ? loanCounts.approval + loanCounts.payout : 0) : 0;
  const allowed = ITEMS.filter((item) => can(user, item.permission))
    .map((item) => {
      const n = item.href === "/console/kyc" ? kycWaiting : item.href === "/console/loans" ? loansWaiting : item.href === "/console/collections" ? loanCounts?.overdue ?? 0 : 0;
      return n ? { ...item, badge: String(n) } : item;
    });
  const groups = ["Overview", "Operations", "Administration"] as const;
  const sections = groups
    .map((g) => ({ title: g === "Overview" ? undefined : g, items: allowed.filter((i) => i.group === g).map(({ href, label, icon, badge }) => ({ href, label, icon, badge })) }))
    .filter((s) => s.items.length);

  return (
    <AppShell logos={await getLogos()} unread={await unreadCount(user.id)} variant="console" sections={sections} user={{ name: fullName(user), email: user.email, roleLabel: user.role.name }}>
      {children}
      {timing && <SessionWatch initial={timing} />}
    </AppShell>
  );
}
