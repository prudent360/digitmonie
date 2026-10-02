import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage, type PolicySection } from "@/components/site/policy-page";
import { LEGAL_UPDATED, legalDetails } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of Use", description: "The agreement that governs your DigitMonie account and use of our app and website." };

export default async function TermsPage() {
  const c = await legalDetails();
  const sections: PolicySection[] = [
    {
      id: "about", title: "About DigitMonie and these terms",
      content: <>
        <p>DigitMonie is operated by <strong>{c.company}</strong>{c.rc ? `, RC ${c.rc}` : ""}, a company registered in Nigeria{c.address ? ` with its registered office at ${c.address}` : ""}. We are licensed by the Federal Competition and Consumer Protection Commission (FCCPC){c.licence ? ` (licence ${c.licence})` : ""} to provide digital consumer lending.</p>
        <p>These Terms of Use form an agreement between you and us whenever you use the DigitMonie website, app or any related service. By opening an account you confirm that you have read and accept them, together with our <Link href="/privacy">Privacy Policy</Link>. Each loan is also governed by our <Link href="/loan-terms">Loan Terms</Link> and the Key Facts shown to you before you accept it.</p>
      </>,
    },
    {
      id: "eligibility", title: "Who can use DigitMonie",
      content: <>
        <p>To open an account you must:</p>
        <ul>
          <li>be at least 18 years old;</li>
          <li>live in Nigeria and have a valid Bank Verification Number (BVN) and a Nigerian bank account in your own name;</li>
          <li>give us true, complete and current information; and</li>
          <li>hold only one DigitMonie account. Each BVN and NIN can be linked to one account only.</li>
        </ul>
        <p>We may decline to open an account, or ask for more information, where we cannot verify who you are or where the law requires it.</p>
      </>,
    },
    {
      id: "security", title: "Your account and security",
      content: <>
        <p>You are responsible for everything done with your account. Keep your password, transaction PIN and one-time codes private, and use a device only you control.</p>
        <ul>
          <li><strong>We will never ask</strong> for your password, PIN or one-time codes by phone, email, SMS, WhatsApp or social media.</li>
          <li>Tell us straight away at <a href={`mailto:${c.email}`}>{c.email}</a> if you think someone else has accessed your account. We can sign you out of every device and lock your PIN.</li>
          <li>Five wrong PIN attempts lock PIN use for 30 minutes, to protect you.</li>
        </ul>
      </>,
    },
    {
      id: "verification", title: "Identity verification (KYC)",
      content: <>
        <p>Nigerian law requires us to confirm who our customers are. We verify you in tiers: your BVN and date of birth (Tier 1), your NIN and a selfie (Tier 2), and your address with a recent proof of address (Tier 3). Each tier unlocks higher limits.</p>
        <p>With your consent, we check your details with the Nigeria Inter-Bank Settlement System (NIBSS) and the National Identity Management Commission (NIMC) through a licensed verification partner. Checking your BVN does <strong>not</strong> give us access to your bank accounts. How we handle this information is explained in our <Link href="/privacy">Privacy Policy</Link>.</p>
      </>,
    },
    {
      id: "services", title: "Our services",
      content: <>
        <p>DigitMonie provides short-term consumer and small-business loans. Every loan is subject to an assessment, our <Link href="/loan-terms">Loan Terms</Link> and the Key Facts we show you before you accept, which set out exactly what you will receive and repay.</p>
        <p>Savings, investment and payment features are not yet available. When we offer them, they will be provided with licensed partners, and their terms will be shown to you before you use them. We are not a bank, and money in your own bank account is not held by us.</p>
      </>,
    },
    {
      id: "fees", title: "Fees and charges",
      content: <>
        <p>Opening and keeping a DigitMonie account is free. The only charges are those of a loan you choose to take: interest, a one-off processing fee and, if a repayment is late, a one-off late fee. All of them are shown in your Key Facts before you accept the loan, and we will never add a charge you weren&apos;t told about.</p>
        <p>Your bank or payment provider may charge you for making a transfer to us. Those charges are set by them, not us.</p>
      </>,
    },
    {
      id: "communications", title: "How we contact you",
      content: <>
        <p>We send important messages about your account and loans in the app, by email and by SMS, to the details you give us. Keep them up to date. You can&apos;t switch off messages about security or money you owe, but you can opt out of marketing at any time.</p>
        <p>We contact only <strong>you</strong> about your account. We do not access your phone contacts, photos or messages, and we will never contact your family, friends, employer or anyone in your phonebook about a debt.</p>
      </>,
    },
    {
      id: "acceptable-use", title: "Things you must not do",
      content: <>
        <ul>
          <li>Give false information or use another person&apos;s identity, BVN, NIN, photo or bank account.</li>
          <li>Use DigitMonie for fraud, money laundering, terrorist financing or any other unlawful purpose.</li>
          <li>Try to access accounts or data that aren&apos;t yours, test or bypass our security, or copy, scrape or reverse engineer the service.</li>
          <li>Threaten, abuse or harass our staff.</li>
        </ul>
        <p>We must report suspicious activity to the authorities where the law requires it, and we may be prevented from telling you that we have done so.</p>
      </>,
    },
    {
      id: "suspension", title: "Restricting, freezing or closing an account",
      content: <>
        <p>We may restrict or freeze your account, stop new loans, or close the account where we reasonably suspect fraud or unlawful activity, where you seriously or repeatedly break these Terms, or where a regulator, court or law requires it. Where the law allows, we will tell you why and what you can do.</p>
        <p>You can ask us to close your account at any time once you owe nothing. Restricted and frozen accounts can still sign in and repay loans. Closing an account doesn&apos;t cancel money already owed, and we keep certain records for as long as the law requires.</p>
      </>,
    },
    {
      id: "ip", title: "Our content and brand",
      content: <p>The DigitMonie name, logo, app, website and content belong to {c.company} or its licensors. You may use them only to manage your own account. You must not copy, modify or distribute them without our written permission.</p>,
    },
    {
      id: "availability", title: "Availability and changes to the service",
      content: <p>We work hard to keep DigitMonie available and secure, but we can&apos;t promise it will never be interrupted, for example during maintenance or when a bank, payment partner or network is down. We may improve, change or stop features. Where a change materially affects you, we will tell you in advance.</p>,
    },
    {
      id: "liability", title: "Our responsibility to you",
      content: <>
        <p>We will provide our services with reasonable care and skill. We are not responsible for losses caused by things outside our reasonable control, by your failure to keep your login details safe, or by your breaking these Terms.</p>
        <p>Nothing in these Terms limits your rights under the Federal Competition and Consumer Protection Act, 2018 or any other law that cannot be excluded by agreement.</p>
      </>,
    },
    {
      id: "changes", title: "Changes to these terms",
      content: <p>We may update these Terms to reflect changes in the law, our services or how we work. We will tell you about material changes by email or in the app at least 14 days before they take effect. If you don&apos;t agree, you can close your account before then (once you owe nothing). The date at the top shows when they last changed.</p>,
    },
    {
      id: "law", title: "Governing law and complaints",
      content: <>
        <p>These Terms are governed by the laws of the Federal Republic of Nigeria, and the Nigerian courts have jurisdiction over any dispute.</p>
        <p>If something goes wrong, please tell us first through our <Link href="/complaints">complaints process</Link>. If you aren&apos;t satisfied with our response, you can escalate your complaint to the FCCPC.</p>
      </>,
    },
    {
      id: "contact", title: "Contact us",
      content: <p>Email <a href={`mailto:${c.email}`}>{c.email}</a>{c.phone ? <>, call {c.phone}</> : null}{c.address ? <>, or write to {c.company}, {c.address}</> : null}.</p>,
    },
  ];

  return (
    <PolicyPage
      title="Terms of Use"
      summary="The agreement that governs your DigitMonie account, how we verify you, how we contact you, and what each of us can expect from the other."
      updated={LEGAL_UPDATED}
      current="/terms"
      supportEmail={c.email}
      intro={<p>These terms apply to the DigitMonie website, app and services. Each loan is also governed by our <Link href="/loan-terms">Loan Terms</Link>, and our <Link href="/privacy">Privacy Policy</Link> explains how we use your information.</p>}
      sections={sections}
    />
  );
}
