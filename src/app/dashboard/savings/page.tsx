import type { Metadata } from "next";
import { ComingSoon } from "@/components/app/coming-soon";
import { PiggyIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Savings" };

export default function SavingsPage() {
  return (
    <ComingSoon
      icon={<PiggyIcon />}
      title="Savings"
      text="Save towards rent, school fees or a rainy day, automatically."
      features={["Goals for the things you care about", "Automatic daily, weekly or monthly saving", "Flexible or locked plans", "Track every goal in the app"]}
    />
  );
}
