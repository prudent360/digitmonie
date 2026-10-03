import { unreadCount } from "@/lib/notifications";
import { getLogos } from "@/lib/branding";
import { SessionWatch } from "@/components/app/session-watch";
import { ViewingBanner } from "@/components/app/viewing-banner";
import { Suspense } from "react";
import { AppShell, type NavSection } from "@/components/app/app-shell";
import { CardIcon, HomeIcon, IdCardIcon, LandmarkIcon, PiggyIcon, ReceiptIcon, SettingsIcon, TrendUpIcon, WalletIcon } from "@/components/icons";
import { fullName, requireCustomer, sessionTiming, viewingAs } from "@/lib/auth";

const SECTIONS: NavSection[] = [
  { items: [
    { href: "/dashboard", label: "Home", icon: <HomeIcon /> },
    { href: "/dashboard/loans", label: "Loans", icon: <LandmarkIcon /> },
    { href: "/dashboard/transactions", label: "Transactions", icon: <ReceiptIcon /> },
  ] },
  { title: "Coming soon", items: [
    { href: "/dashboard/wallet", label: "Wallet & transfers", icon: <WalletIcon />, badge: "Soon" },
    { href: "/dashboard/savings", label: "Savings", icon: <PiggyIcon />, badge: "Soon" },
    { href: "/dashboard/investments", label: "Investments", icon: <TrendUpIcon />, badge: "Soon" },
    { href: "/dashboard/cards", label: "Cards", icon: <CardIcon />, badge: "Soon" },
  ] },
  { title: "Account", items: [
    { href: "/dashboard/verify", label: "Verify identity", icon: <IdCardIcon /> },
    { href: "/dashboard/settings", label: "Settings", icon: <SettingsIcon /> },
  ] },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCustomer();
  const timing = await sessionTiming();
  const viewer = await viewingAs();
  return (
    <AppShell logos={await getLogos()} unread={await unreadCount(user.id)} variant="customer" sections={SECTIONS} user={{ name: fullName(user), email: user.email, roleLabel: `Personal · Tier ${user.kycTier}` }}>
      {viewer && <Suspense><ViewingBanner customer={fullName(user)} staff={fullName(viewer)} /></Suspense>}
      {user.status !== "active" && (
        <p role="status" className="mb-6 rounded-[7px] border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
          {user.status === "frozen" ? "Your account is frozen." : "Some features on your account are paused."} You can still sign in and repay loans, but you can&apos;t apply for new ones. Please contact support if you have questions.
        </p>
      )}
      {children}
      {timing && <SessionWatch initial={timing} viewing={Boolean(viewer)} />}
    </AppShell>
  );
}
