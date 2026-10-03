import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage, type PolicySection } from "@/components/site/policy-page";
import { LEGAL_UPDATED, legalDetails } from "@/lib/legal";
import { staffTwoFactorRequired } from "@/lib/auth";

export const metadata: Metadata = { title: "Privacy Policy", description: "How DigitMonie collects, uses, shares and protects your personal information." };

export default async function PrivacyPage() {
  const c = await legalDetails();
  const twoFactor = await staffTwoFactorRequired();
  const sections: PolicySection[] = [
    {
      id: "who-we-are", title: "Who we are",
      content: <>
        <p><strong>{c.company}</strong>{c.rc ? ` (RC ${c.rc})` : ""}{c.address ? `, ${c.address}` : ""}, is the data controller for the personal information described here. We follow the Nigeria Data Protection Act, 2023 (NDPA) and the rules of the Nigeria Data Protection Commission (NDPC).</p>
        <p>Our data protection officer can be reached at <a href={`mailto:${c.dpo}`}>{c.dpo}</a>.</p>
      </>,
    },
    {
      id: "what-we-collect", title: "What we collect",
      content: <>
        <p><strong>Information you give us:</strong> your name, phone number, email, date of birth, home address, BVN, NIN, a selfie, proof of address, your employment and income, the bank account you want loans paid into, bank statements you upload, and anything you tell our support team.</p>
        <p><strong>Information we collect when you use DigitMonie:</strong> your device and browser type, IP address, sign-in times, the pages and features you use, and records of your loans and payments.</p>
        <p><strong>Information from others:</strong> confirmation of your identity from NIBSS and NIMC through our verification partner; your credit history from licensed credit bureaus; the account name your bank holds for your payout account; and payment confirmations from our payment partners.</p>
      </>,
    },
    {
      id: "what-we-dont", title: "What we never collect or do",
      content: <ul>
        <li>We <strong>do not</strong> read your phone contacts, call logs, photos, SMS or social media.</li>
        <li>We <strong>never</strong> contact your family, friends, employer or anyone else about a debt, and never publish or shame borrowers.</li>
        <li>We <strong>do not</strong> sell your personal information.</li>
        <li>We <strong>do not</strong> store your card details. Card payments are handled by our payment partners.</li>
      </ul>,
    },
    {
      id: "how-we-use", title: "How we use it, and why we're allowed to",
      content: <>
        <p>The NDPA requires a lawful basis for each use of your information:</p>
        <table>
          <thead><tr><th>What we do</th><th>Lawful basis</th></tr></thead>
          <tbody>
            <tr><td>Open and run your account, process loan applications, pay out loans and collect repayments</td><td>Performing our contract with you</td></tr>
            <tr><td>Verify your identity (BVN, NIN, selfie, address), keep records and report suspicious activity</td><td>Legal obligation (anti-money laundering and KYC rules) and your consent to identity checks</td></tr>
            <tr><td>Check your credit history and report your loans to credit bureaus</td><td>Legal obligation under the Credit Reporting Act, 2017 and our legitimate interest in lending responsibly</td></tr>
            <tr><td>Assess whether you can afford a loan and set your limit</td><td>Performing our contract and our legitimate interest in responsible lending</td></tr>
            <tr><td>Send you security alerts, repayment reminders and account notices</td><td>Performing our contract</td></tr>
            <tr><td>Prevent fraud and keep DigitMonie secure</td><td>Legitimate interest and legal obligation</td></tr>
            <tr><td>Send you offers and news</td><td>Your consent, which you can withdraw at any time</td></tr>
          </tbody>
        </table>
      </>,
    },
    {
      id: "automated-decisions", title: "Automated credit decisions",
      content: <>
        <p>When you apply for a loan, a scoring system looks at your verification level, how your repayment compares with your declared income, your history with us and your credit bureau report. Small loans with strong results may be approved, and applications that clearly don&apos;t meet our criteria may be declined, automatically. Everything else is reviewed by our staff.</p>
        <p>If an automated decision affects you, you can ask for a person to review it, explain your circumstances and challenge it by writing to <a href={`mailto:${c.email}`}>{c.email}</a>.</p>
      </>,
    },
    {
      id: "sharing", title: "Who we share it with",
      content: <>
        <p>We share only what each party needs, under written agreements that require them to protect it:</p>
        <ul>
          <li><strong>Identity verification partners</strong>, to check your BVN, NIN and selfie with NIBSS and NIMC.</li>
          <li><strong>Licensed credit bureaus</strong>, to check your credit history and report your loans.</li>
          <li><strong>Payment partners</strong> (such as Flutterwave and Paystack), to pay out loans, verify bank accounts and collect repayments.</li>
          <li><strong>Messaging and email providers</strong>, to send you codes, alerts and reminders.</li>
          <li><strong>Hosting and IT providers</strong> that run our systems.</li>
          <li><strong>Regulators, law enforcement and courts</strong> (such as the FCCPC, CBN, NFIU and EFCC) when the law requires it.</li>
          <li><strong>Professional advisers</strong> (lawyers, auditors) under duties of confidentiality.</li>
        </ul>
        <p>Some of these providers store or process data outside Nigeria. When that happens we rely on the safeguards the NDPA allows, such as adequacy decisions or contractual protections.</p>
      </>,
    },
    {
      id: "retention", title: "How long we keep it",
      content: <ul>
        <li><strong>Identity (KYC) and transaction records:</strong> at least 5 years after our relationship ends, as anti-money laundering law requires.</li>
        <li><strong>Loan records:</strong> for as long as the loan is open, then for at least 5 years.</li>
        <li><strong>Declined or abandoned applications:</strong> up to 2 years, to prevent fraud and answer questions.</li>
        <li><strong>Marketing preferences:</strong> until you withdraw consent.</li>
      </ul>,
    },
    {
      id: "security", title: "How we protect it",
      content: <p>Your BVN and NIN are encrypted, and identity documents are stored privately where only authorised staff can open them. Every staff view is recorded. {twoFactor ? "Staff accounts need two-factor sign-in, access" : "Staff access"} is limited by role, and every staff action is written to an audit log. Data is encrypted in transit. No system is perfectly secure, but we will tell you and the NDPC without undue delay if a breach is likely to put you at risk.</p>,
    },
    {
      id: "your-rights", title: "Your rights",
      content: <>
        <p>Under the NDPA you can ask us to:</p>
        <ul>
          <li>tell you what personal information we hold and give you a copy;</li>
          <li>correct information that is wrong or incomplete;</li>
          <li>delete it, or stop or limit how we use it, where we no longer have a lawful reason to keep it;</li>
          <li>send it to you or another provider in a commonly used format;</li>
          <li>stop using it for marketing; and</li>
          <li>withdraw any consent you have given, without affecting what we did before.</li>
        </ul>
        <p>Email <a href={`mailto:${c.dpo}`}>{c.dpo}</a>. We reply within 30 days, and we may need to confirm your identity first. Some information must be kept even if you ask us to delete it, for example records anti-money laundering law requires. If you are unhappy with how we handle your information, you can complain to the Nigeria Data Protection Commission.</p>
      </>,
    },
    {
      id: "children", title: "Children",
      content: <p>DigitMonie is only for people aged 18 and over. We do not knowingly collect information about children. If you believe a child has given us information, contact us and we will delete it.</p>,
    },
    {
      id: "cookies", title: "Cookies",
      content: <p>We use a small number of essential cookies to keep you signed in and secure. We don&apos;t use advertising cookies. See our <Link href="/cookies">Cookie Policy</Link>.</p>,
    },
    {
      id: "changes", title: "Changes to this policy",
      content: <p>We will update this policy when how we use information changes, and tell you about important changes in the app or by email. The date at the top shows when it last changed.</p>,
    },
  ];

  return (
    <PolicyPage
      title="Privacy Policy"
      summary="What we collect, why we need it, who we share it with, how long we keep it, and the rights you have under the Nigeria Data Protection Act, 2023."
      updated={LEGAL_UPDATED}
      current="/privacy"
      supportEmail={c.email}
      intro={<p>We collect only what we need to verify you, lend responsibly and meet our legal duties. We never read your contacts, never contact anyone else about your loan, and never sell your data.</p>}
      sections={sections}
    />
  );
}
