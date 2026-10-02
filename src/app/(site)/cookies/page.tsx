import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage, type PolicySection } from "@/components/site/policy-page";
import { LEGAL_UPDATED, legalDetails } from "@/lib/legal";

export const metadata: Metadata = { title: "Cookie Policy", description: "The few cookies DigitMonie uses, and why." };

export default async function CookiesPage() {
  const c = await legalDetails();
  const sections: PolicySection[] = [
    {
      id: "what", title: "What cookies are",
      content: <p>Cookies are small files a website stores in your browser so it can remember you between pages, for example that you&apos;re signed in.</p>,
    },
    {
      id: "ours", title: "The cookies we use",
      content: <>
        <p>We use only cookies that are <strong>strictly necessary</strong> for DigitMonie to work securely:</p>
        <table>
          <thead><tr><th>Cookie</th><th>What it does</th><th>How long</th></tr></thead>
          <tbody>
            <tr><td><code>dm_session</code></td><td>Keeps you signed in, securely. It can&apos;t be read by scripts on the page.</td><td>Up to 12 hours (8 for staff)</td></tr>
            <tr><td><code>dm_pending</code></td><td>Remembers a sign-in or sign-up step in progress, such as entering your verification code.</td><td>15 minutes</td></tr>
          </tbody>
        </table>
        <p>We don&apos;t use advertising or tracking cookies, and we don&apos;t let other companies set cookies to follow you around the web.</p>
      </>,
    },
    {
      id: "partners", title: "Payment and verification pages",
      content: <p>When you pay through Flutterwave or Paystack, or take a selfie, you may use pages or tools run by those partners, which set their own cookies under their own policies.</p>,
    },
    {
      id: "control", title: "Controlling cookies",
      content: <p>You can block or delete cookies in your browser settings, but because ours are essential, DigitMonie won&apos;t work properly without them; you won&apos;t be able to stay signed in. More about how we handle your information is in our <Link href="/privacy">Privacy Policy</Link>.</p>,
    },
  ];

  return (
    <PolicyPage
      title="Cookie Policy"
      summary="We use only the cookies needed to keep you signed in and secure. No advertising or tracking cookies."
      updated={LEGAL_UPDATED}
      current="/cookies"
      supportEmail={c.email}
      intro={<p>Short version: two essential cookies for signing in, nothing else.</p>}
      sections={sections}
    />
  );
}
