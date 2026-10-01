import { AppShell, type NavSection } from "@/components/app/app-shell";
import { CardIcon, HomeIcon, LandmarkIcon, PiggyIcon, ReceiptIcon, SettingsIcon, TrendUpIcon, WalletIcon } from "@/components/icons";
import { ROLE_LABELS, can } from "@/lib/roles";
import { requireSession } from "@/lib/session";

const SECTIONS: NavSection[] = [
  { items: [
    { href: "/dashboard", label: "Home", icon: <HomeIcon /> },
    { href: "/dashboard/wallet", label: "Wallet & transfers", icon: <WalletIcon /> },
    { href: "/dashboard/transactions", label: "Transactions", icon: <ReceiptIcon /> },
  ] },
  { title: "Grow", items: [
    { href: "/dashboard/savings", label: "Savings", icon: <PiggyIcon /> },
    { href: "/dashboard/investments", label: "Investments", icon: <TrendUpIcon />, badge: "21%" },
    { href: "/dashboard/loans", label: "Loans", icon: <LandmarkIcon /> },
  ] },
  { title: "Account", items: [
    { href: "/dashboard/settings", label: "Settings & KYC", icon: <SettingsIcon /> },
    { href: "/dashboard/wallet#cards", label: "Cards", icon: <CardIcon /> },
  ] },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  return (
    <AppShell
      variant="customer"
      sections={SECTIONS}
      user={{ name: session.name, email: session.email, roleLabel: session.role === "customer" ? "Personal account" : ROLE_LABELS[session.role] }}
      switchLink={can(session.role, "console.access") ? { href: "/console", label: "Go to console →" } : undefined}
    >
      {children}
    </AppShell>
  );
}
