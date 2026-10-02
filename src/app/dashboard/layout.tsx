import { AppShell, type NavSection } from "@/components/app/app-shell";
import { CardIcon, HomeIcon, LandmarkIcon, PiggyIcon, ReceiptIcon, SettingsIcon, TrendUpIcon, WalletIcon } from "@/components/icons";
import { fullName, requireCustomer } from "@/lib/auth";

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
  const user = await requireCustomer();
  return (
    <AppShell variant="customer" sections={SECTIONS} user={{ name: fullName(user), email: user.email, roleLabel: `Personal · Tier ${user.kycTier}` }}>
      {children}
    </AppShell>
  );
}
