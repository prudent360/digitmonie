import { unreadCount } from "@/lib/notifications";
import { getLogos } from "@/lib/branding";
import { AppShell, type NavSection } from "@/components/app/app-shell";
import { CardIcon, HomeIcon, IdCardIcon, LandmarkIcon, PiggyIcon, ReceiptIcon, SettingsIcon, TrendUpIcon, WalletIcon } from "@/components/icons";
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
    { href: "/dashboard/verify", label: "Verify identity", icon: <IdCardIcon /> },
    { href: "/dashboard/settings", label: "Settings", icon: <SettingsIcon /> },
    { href: "/dashboard/wallet#cards", label: "Cards", icon: <CardIcon /> },
  ] },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCustomer();
  return (
    <AppShell logos={await getLogos()} unread={await unreadCount(user.id)} variant="customer" sections={SECTIONS} user={{ name: fullName(user), email: user.email, roleLabel: `Personal · Tier ${user.kycTier}` }}>
      {user.status !== "active" && (
        <p role="status" className="mb-6 rounded-[7px] border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          {user.status === "frozen" ? "Your account is frozen." : "Some features on your account are paused."} You can still sign in and repay loans, but you can&apos;t apply for new ones. Please contact support if you have questions.
        </p>
      )}
      {children}
    </AppShell>
  );
}
