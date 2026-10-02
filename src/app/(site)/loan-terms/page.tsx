import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { PolicyPage, type PolicySection } from "@/components/site/policy-page";
import { getDb } from "@/db";
import { loanProducts } from "@/db/schema";
import { LEGAL_UPDATED, legalDetails } from "@/lib/legal";
import { bpsToPercent, toNaira } from "@/lib/loans/math";

export const metadata: Metadata = { title: "Loan Terms", description: "The terms that apply to every DigitMonie loan: costs, repayment, late payment and your rights." };

const ngn = (kobo: number) => `₦${toNaira(kobo).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;

export default async function LoanTermsPage() {
  const c = await legalDetails();
  const products = await (await getDb()).select().from(loanProducts).where(eq(loanProducts.active, true)).orderBy(asc(loanProducts.minAmount));

  const sections: PolicySection[] = [
    {
      id: "agreement", title: "Your loan agreement",
      content: <>
        <p>Your loan agreement with <strong>{c.company}</strong> is made up of these Loan Terms, our <Link href="/terms">Terms of Use</Link>, and the <strong>Key Facts</strong> shown to you on the application screen before you accept: the amount, what you will receive, the interest rate, every fee, the annual percentage rate (APR), each repayment and its due date, and the total you will repay.</p>
        <p>You accept a loan by ticking that you have read the Key Facts and these terms and confirming with your transaction PIN. You can save or screenshot the Key Facts, and you can see them, and your repayment schedule, in the app at any time.</p>
      </>,
    },
    {
      id: "applying", title: "Applying and how we decide",
      content: <>
        <p>We lend only what we reasonably believe you can afford. When you apply we look at your verification level, the income you declare, how the repayment compares with it, your history with us, your credit bureau report and, for larger loans, your bank statement.</p>
        <ul>
          <li>By applying, you agree that we may check your credit history with licensed credit bureaus and confirm the name on your payout account with your bank.</li>
          <li>Some applications are decided automatically; others are reviewed by a person, and every staff approval is checked by a second person. You can ask for a human review of any automated decision.</li>
          <li>If we decline your application, we tell you why.</li>
          <li>You can cancel an application at any time before the money is sent.</li>
        </ul>
      </>,
    },
    {
      id: "products", title: "Our current loans",
      content: <>
        <p>The table shows the loans we currently offer. Your own amount, period and costs are always the ones shown in your Key Facts.</p>
        {products.length ? (
          <div className="overflow-x-auto">
            <table>
              <thead><tr><th>Loan</th><th>Amount</th><th>Repay over</th><th>Interest</th><th>Processing fee</th><th>Late fee</th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{ngn(p.minAmount)} – {ngn(p.maxAmount)}</td>
                    <td>{p.tenors[0]}{p.tenors.length > 1 ? `–${p.tenors.at(-1)}` : ""} month{p.tenors.at(-1)! > 1 ? "s" : ""}</td>
                    <td>{bpsToPercent(p.monthlyRateBps)} a month, {p.interestMethod === "flat" ? "flat" : "reducing balance"}</td>
                    <td>{bpsToPercent(p.processingFeeBps)} of the amount</td>
                    <td>{bpsToPercent(p.lateFeeBps)} of an overdue repayment, once</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p>No loans are being offered right now.</p>}
      </>,
    },
    {
      id: "cost", title: "The cost of your loan",
      content: <>
        <ul>
          <li><strong>Interest</strong> is charged monthly at the rate in your Key Facts. On a reducing-balance loan, interest is worked out on what you still owe, so it goes down as you repay. On a flat-rate loan, it is worked out on the original amount.</li>
          <li><strong>The processing fee</strong> is a one-off charge taken from the loan when it is paid out. Your Key Facts show the exact amount you will receive.</li>
          <li><strong>The APR</strong> in your Key Facts shows the yearly cost of the loan including the processing fee, so you can compare it with other loans.</li>
          <li>There are <strong>no other charges</strong>: no account fees, no early repayment fees, and no charges added that weren&apos;t in your Key Facts.</li>
        </ul>
      </>,
    },
    {
      id: "payout", title: "Paying out your loan",
      content: <p>We send the money only to a bank account in your own name, which we confirm with your bank. Your repayment schedule starts on the day the money is sent. If we can&apos;t complete the transfer, we tell you and we don&apos;t charge interest until the money reaches you.</p>,
    },
    {
      id: "repaying", title: "Repaying",
      content: <>
        <ul>
          <li>Repay in the app by card, bank transfer or USSD, on or before each due date. We remind you a few days before.</li>
          <li>Each payment goes to your oldest unpaid repayment first: any late fee, then interest, then the amount borrowed.</li>
          <li><strong>Early repayment:</strong> you can repay early at any time, with no penalty. To settle the whole loan early you pay what you still owe of the amount borrowed, any unpaid late fees, and interest only for the months that have started. Interest for later months is cancelled. The app shows your settlement amount.</li>
        </ul>
      </>,
    },
    {
      id: "late", title: "If you pay late",
      content: <>
        <p>If a repayment isn&apos;t made by its due date, it becomes overdue and a <strong>one-off late fee</strong> (shown in your Key Facts) is added to it. We don&apos;t charge interest on late fees, and we don&apos;t add a late fee more than once to the same repayment.</p>
        <p>Late repayments are reported to credit bureaus, which can make it harder to borrow in future, from us or anyone else. If you are struggling, <strong>please talk to us early</strong>: we can agree a new date or a new repayment schedule, and we may waive late fees.</p>
      </>,
    },
    {
      id: "collections", title: "How we collect overdue loans",
      content: <>
        <p>We follow the FCCPC&apos;s rules for digital lenders. When a repayment is overdue we will:</p>
        <ul>
          <li>contact only <strong>you</strong>, by phone, SMS, email or WhatsApp, and only between 8am and 6pm;</li>
          <li>be respectful and honest, and never threaten, insult or mislead you;</li>
          <li><strong>never</strong> contact your family, friends, employer or anyone in your contacts, and never publish your details or shame you; and</li>
          <li>keep a record of every contact.</li>
        </ul>
        <p>If you feel you have been treated unfairly, please use our <Link href="/complaints">complaints process</Link>.</p>
      </>,
    },
    {
      id: "default", title: "Default",
      content: <p>If repayments remain unpaid after we have contacted you and tried to agree a plan, we may treat the loan as in default. We will report this to credit bureaus, you won&apos;t be able to take new loans until it is repaid, and we may take lawful steps to recover the money, including through the courts. Even if we write a loan off in our own books, the money is still owed and you can repay it at any time.</p>,
    },
    {
      id: "changes", title: "Changes to your loan",
      content: <p>We will never change the interest rate, fees or repayments of a loan you have already accepted without your agreement. Changes to our loan products or these terms apply only to new loans. If we agree a new schedule with you, we confirm it in writing and show it in the app.</p>,
    },
    {
      id: "rights", title: "Your rights",
      content: <ul>
        <li>To see all costs before you accept, and your schedule and balance at any time.</li>
        <li>To cancel an application before the money is sent, and to repay early with no penalty.</li>
        <li>To ask for a human review of an automated decision.</li>
        <li>To complain to us, and to the FCCPC if you aren&apos;t satisfied. See <Link href="/complaints">Complaints</Link>.</li>
        <li>Your rights over your personal information, explained in our <Link href="/privacy">Privacy Policy</Link>.</li>
      </ul>,
    },
    {
      id: "law", title: "Licence and governing law",
      content: <p>DigitMonie loans are provided by {c.company}, licensed by the Federal Competition and Consumer Protection Commission{c.licence ? ` (licence ${c.licence})` : ""}. Your loan agreement is governed by the laws of the Federal Republic of Nigeria.</p>,
    },
  ];

  return (
    <PolicyPage
      title="Loan Terms"
      summary="What every DigitMonie loan costs, how repayment works, what happens if you pay late, how we collect, and your rights as a borrower."
      updated={LEGAL_UPDATED}
      current="/loan-terms"
      supportEmail={c.email}
      intro={<p>Before you accept any loan you see its <strong>Key Facts</strong>: what you&apos;ll receive, every fee, the APR, each repayment and the total to repay. Those, together with these terms, are your agreement. There are no hidden charges.</p>}
      sections={sections}
    />
  );
}
