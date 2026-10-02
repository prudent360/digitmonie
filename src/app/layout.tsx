import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

// Montserrat matches the geometric wordmark; Inter keeps numbers and body text legible.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: "DigitMonie — Simple Money. Bigger Possibilities.", template: "%s · DigitMonie" },
  description: "Loans paid straight to your bank account, with the full cost shown upfront. Licensed by the FCCPC. Savings and investments coming soon.",
  // Resolves to the favicon uploaded in Settings → Branding, or the built-in mark.
  icons: { icon: "/brand-icon", apple: "/brand-icon" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NG" data-scroll-behavior="smooth" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
