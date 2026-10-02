import type { Metadata } from "next";
import { ComingSoon } from "@/components/app/coming-soon";
import { TrendUpIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Investments" };

export default function InvestmentsPage() {
  return (
    <ComingSoon
      icon={<TrendUpIcon />}
      title="Investments"
      text="Naira investments you can understand, with your expected returns shown before you put in a naira."
      features={["Treasury bills and money market funds", "Expected returns shown upfront", "Track your portfolio in the app", "Offered with licensed partners"]}
    />
  );
}
