import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage, type PolicySection } from "@/components/site/policy-page";
import { LEGAL_UPDATED, legalDetails } from "@/lib/legal";

export const metadata: Metadata = { title: "Complaints", description: "How to make a complaint to DigitMonie, what happens next, and how to escalate it." };

export default async function ComplaintsPage() {
  const c = await legalDetails();
  const sections: PolicySection[] = [
    {
      id: "how", title: "How to complain",
      content: <>
        <p>Tell us by email at <a href={`mailto:${c.email}?subject=Complaint`}>{c.email}</a> with &ldquo;Complaint&rdquo; in the subject{c.phone ? <>, or call {c.phone}</> : null}{c.address ? <>, or write to {c.company}, {c.address}</> : null}.</p>
        <p>To help us resolve it quickly, include:</p>
        <ul>
          <li>your name and the phone number or email on your account;</li>
          <li>your loan reference (it starts with LN-), if it&apos;s about a loan;</li>
          <li>what happened, when, and what you would like us to do; and</li>
          <li>any screenshots or receipts.</li>
        </ul>
        <p><strong>Never</strong> send us your password, PIN or one-time codes. We will never ask for them.</p>
      </>,
    },
    {
      id: "what-next", title: "What happens next",
      content: <ol>
        <li><strong>Within 1 working day</strong> we acknowledge your complaint and give you a reference.</li>
        <li>Someone who wasn&apos;t involved in the original issue looks into it, and may contact you for more information.</li>
        <li><strong>Within 10 working days</strong> we send you our response in writing, explaining what we found and what we will do. If we need longer, we tell you why and when to expect it.</li>
        <li>If we got something wrong, we put it right. That can mean correcting your records or credit report, refunding charges, waiving fees, or adjusting your repayments.</li>
      </ol>,
    },
    {
      id: "while", title: "While we look into it",
      content: <p>If your complaint is about money you owe, tell us and we will pause collection contact about the disputed amount while we investigate. Please keep paying any part you don&apos;t dispute, to avoid late fees and credit bureau reports.</p>,
    },
    {
      id: "escalate", title: "If you're not satisfied",
      content: <>
        <p>If you aren&apos;t happy with our response, or haven&apos;t heard from us within the time above, you can escalate your complaint to:</p>
        <ul>
          <li><strong>The Federal Competition and Consumer Protection Commission (FCCPC)</strong>, which licenses and regulates DigitMonie as a digital lender. You can file a complaint through the FCCPC&apos;s website or offices.</li>
          <li><strong>The Nigeria Data Protection Commission (NDPC)</strong>, for complaints about how we handle your personal information.</li>
        </ul>
        <p>Using our process first usually gets the fastest result, but you can go to the regulator at any time.</p>
      </>,
    },
    {
      id: "fair", title: "Our commitment",
      content: <p>Making a complaint will never affect how we treat you, your loan limit or future applications. We use complaints to improve, and we report on them to our regulator when required. If you think one of our staff, or anyone acting for us, has broken the collection rules in our <Link href="/loan-terms">Loan Terms</Link>, please tell us straight away.</p>,
    },
  ];

  return (
    <PolicyPage
      title="Complaints"
      summary="If something has gone wrong, we want to put it right. Here's how to tell us, what happens next, and where to go if you aren't satisfied."
      updated={LEGAL_UPDATED}
      current="/complaints"
      supportEmail={c.email}
      intro={<p>Email <a className="font-semibold text-brand underline" href={`mailto:${c.email}?subject=Complaint`}>{c.email}</a> with &ldquo;Complaint&rdquo; in the subject. We acknowledge within 1 working day and respond in full within 10 working days.</p>}
      sections={sections}
    />
  );
}
