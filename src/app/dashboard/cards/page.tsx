import type { Metadata } from "next";
import { ComingSoon } from "@/components/app/coming-soon";
import { CardIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Cards" };

export default function CardsPage() {
  return (
    <ComingSoon
      icon={<CardIcon />}
      title="Virtual cards"
      text="Naira virtual cards for safe online shopping and subscriptions."
      features={["Create a card in seconds", "Freeze or delete it any time", "Set spending limits", "See every payment in the app"]}
    />
  );
}
