import type { Metadata } from "next";
import { ComingSoon } from "@/components/app/coming-soon";
import { WalletIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Wallet & transfers" };

export default function WalletPage() {
  return (
    <ComingSoon
      icon={<WalletIcon />}
      title="Wallet, transfers and bills"
      text="One place to hold money, send it to any Nigerian bank and pay your bills."
      features={["Your own account number for receiving money", "Transfers to any Nigerian bank", "Airtime, data, electricity and cable TV", "Virtual cards for safe online shopping"]}
    />
  );
}
