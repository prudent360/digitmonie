import Link from "next/link";
import { CountUp } from "@/components/site/count-up";
import { HeroPhone } from "@/components/site/hero-phone";
import { ProductTabs, type BorrowCopy } from "@/components/site/product-tabs";
import { ScrollPhone } from "@/components/site/scroll-phone";
import { Reveal } from "@/components/site/reveal";
import {
  ArrowRightIcon, CardIcon, CheckIcon, LockIcon, ShieldIcon, UsersIcon, ZapIcon,
} from "@/components/icons";
import { legalDetails } from "@/lib/legal";
import { loanFacts, months, shortNaira, type LoanFacts } from "@/lib/site-facts";

const TRUST = ["Licensed by the FCCPC", "BVN and NIN verified customers", "Identity data encrypted", "Payments by Flutterwave and Paystack", "Full cost shown before you accept", "No collateral", "Repay early, pay less", "Fair, respectful collections"];

const SECURITY = [
  { title: "Licensed and regulated", text: "DigitMonie is licensed by the FCCPC as a digital lender, and we follow its rules on fair pricing and respectful debt collection.", icon: <ShieldIcon className="size-6" /> },
  { title: "Your identity, protected", text: "Your BVN and NIN are encrypted and used only to confirm who you are. Your BVN doesn't give us access to your bank account.", icon: <LockIcon className="size-6" /> },
  { title: "Trusted payment partners", text: "Card payments and transfers go through Flutterwave and Paystack. Your card details never touch our servers.", icon: <CardIcon className="size-6" /> },
  { title: "Your contacts stay private", text: "We never read your phone contacts or message your friends, family or employer about a loan.", icon: <UsersIcon className="size-6" /> },
];

function faqs(facts: LoanFacts | null, email: string) {
  return [
    { q: "Is DigitMonie licensed?", a: "Yes. DigitMonie is licensed by the Federal Competition and Consumer Protection Commission (FCCPC) to provide digital lending services in Nigeria." },
    facts && { q: "How much can I borrow?", a: `Loans range from ${shortNaira(facts.min)} to ${shortNaira(facts.max)}, repaid over ${facts.minTenor === facts.maxTenor ? months(facts.maxTenor) : `${facts.minTenor} to ${months(facts.maxTenor)}`}. Your own limit depends on how far you've verified your identity, your income and your repayment history. You'll see it in the app before you apply.` },
    { q: "How quickly will I get the money?", a: `Once your loan is approved, we send the money straight to a bank account in your name. ${facts?.instant ? "Smaller loans can be approved instantly; bigger ones are checked by our team first." : "Our team checks each application before it's approved."}` },
    facts && { q: "What does a loan cost?", a: `Interest starts from ${facts.lowestRate}% a month${facts.processingFee ? ", plus a one-off processing fee" : ""}. Before you accept, you'll see your monthly repayment, the total you'll repay and the annual percentage rate (APR). There are no hidden charges.` },
    { q: "Can I repay early?", a: "Yes, at any time. Pay off the whole loan early and you won't be charged interest for the months you don't use." },
    { q: "What happens if I miss a repayment?", a: "We'll remind you, and a late fee may apply as set out in your loan agreement. We contact only you, at reasonable hours, and never your friends, family or employer. If you're struggling, talk to us early; we can often agree a new plan." },
    { q: "What do I need to apply?", a: "Your phone number, email address and BVN. Bigger loans need your NIN and a selfie, and the largest also need a proof of address." },
    { q: "When are savings and investments launching?", a: "Savings, investments, transfers and bill payments are coming soon. When they launch, they'll appear in your DigitMonie account." },
    { q: "How do I contact support?", a: `Email us at ${email} and we'll get back to you as soon as we can.` },
  ].filter((f): f is { q: string; a: string } => Boolean(f));
}

/** Borrow tab and How-it-works copy, from the live loan products so the numbers are always true. */
function borrowCopy(facts: LoanFacts | null): { tab: BorrowCopy; points: string[] } {
  const term = facts ? (facts.minTenor === facts.maxTenor ? months(facts.maxTenor) : `${facts.minTenor} to ${months(facts.maxTenor)}`) : "";
  return {
    tab: {
      stat: facts ? `Up to ${shortNaira(facts.max)}` : "No collateral",
      statLabel: facts ? `repaid over ${term}` : "for most customers",
      text: "See how much you can borrow, pick an amount and how long to repay, and get paid straight into your bank account. No collateral.",
      points: ["Licensed by the FCCPC", facts?.instant ? "Instant decisions on smaller loans" : "Every application reviewed by a person", "Full cost shown upfront. Repay early and pay less."],
    },
    points: ["Full cost shown first", "No collateral", ...(facts ? [`${term}`] : [])],
  };
}

function SectionHeading({ eyebrow, title, text, center = false, invert = false }: { eyebrow: string; title: React.ReactNode; text?: string; center?: boolean; invert?: boolean }) {
  return (
    <Reveal className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className={`flex items-center gap-3 text-sm font-bold ${center ? "justify-center" : ""} ${invert ? "text-white/80" : "text-brand"}`}><span className="h-[3px] w-8 bg-gold" />{eyebrow}</p>
      <h2 className={`mt-3 font-display text-3xl font-extrabold leading-tight sm:text-[2.6rem] ${invert ? "text-white" : "text-ink"}`}>{title}</h2>
      {text && <p className={`mt-4 text-lg leading-relaxed ${invert ? "text-white/70" : "text-body"}`}>{text}</p>}
    </Reveal>
  );
}

export default async function HomePage() {
  const [facts, company] = await Promise.all([loanFacts(), legalDetails()]);
  const borrow = borrowCopy(facts);
  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="diamond-pattern relative overflow-hidden bg-brand pb-24 pt-32 text-white sm:pt-36">
        <div className="absolute -left-40 top-10 size-[520px] rounded-full bg-brand-400/30 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:px-8">
          <div>
            <p className="rise-in inline-flex items-center gap-2 rounded-[7px] bg-white/10 py-1.5 pl-1.5 pr-4 text-sm font-semibold ring-1 ring-white/20">
              <span className="rounded-[3px] bg-gold px-2.5 py-0.5 text-xs font-bold text-ink">Soon</span>
              Savings and investments are on the way
            </p>
            <h1 className="rise-in mt-6 font-display text-[2.6rem] font-extrabold leading-[1.05] sm:text-6xl lg:text-[3.4rem] xl:text-[3.9rem]" style={{ animationDelay: "100ms" }}>
              Simple money.
              <br />
              <span className="relative inline-block sm:whitespace-nowrap">
                Bigger possibilities.
                <svg viewBox="0 0 300 12" className="absolute -bottom-5 left-0 w-full" aria-hidden="true" preserveAspectRatio="none">
                  <path d="M2 9 Q150 -2 298 7" fill="none" stroke="#f0ca56" strokeWidth="5" strokeLinecap="round" className="draw-line" />
                </svg>
              </span>
            </h1>
            <p className="rise-in mt-9 max-w-xl text-lg leading-relaxed text-white/80" style={{ animationDelay: "200ms" }}>
              Borrow when life happens, with the full cost shown upfront and the money paid straight into your bank account. One secure account built for Nigerians.
            </p>
            <div className="rise-in mt-9 flex flex-wrap items-center gap-4" style={{ animationDelay: "300ms" }}>
              <Link href="/register" className="group flex items-center gap-2 rounded-[7px] bg-gold px-7 py-4 text-base font-bold text-ink shadow-[0_18px_40px_-16px_rgba(240,202,86,.9)] transition-all hover:-translate-y-0.5 hover:bg-gold-600">
                Open a free account <ArrowRightIcon className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#how-it-works" className="rounded-[7px] px-6 py-4 text-base font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/10">See how it works</a>
            </div>
            <div className="rise-in mt-10 flex flex-wrap items-center gap-6" style={{ animationDelay: "400ms" }}>
              <span className="flex items-center gap-2 rounded-[7px] bg-white/10 px-3 py-2 text-sm font-semibold ring-1 ring-white/20">
                <ShieldIcon className="size-4 text-gold" /> Licensed by the FCCPC
              </span>
              <span className="flex items-center gap-2 rounded-[7px] bg-white/10 px-3 py-2 text-sm font-semibold ring-1 ring-white/20">
                <CheckIcon className="size-4 text-gold" /> No collateral
              </span>
            </div>
          </div>
          <HeroPhone />
        </div>
        {/* Diagonal gold stripe from the brand stationery */}
        <div className="absolute -bottom-10 -right-20 h-24 w-[520px] -rotate-[20deg] bg-gold max-sm:hidden" />
      </section>

      {/* ---------- Trust marquee ---------- */}
      <section className="overflow-hidden py-14" aria-label="Our safeguards">
        <div className="flex w-max animate-marquee gap-4 hover:[animation-play-state:paused]">
          {[...TRUST, ...TRUST].map((item, i) => (
            <span key={i} className="flex items-center gap-2 whitespace-nowrap rounded-[7px] border border-line bg-white px-5 py-2.5 text-sm font-semibold text-body" aria-hidden={i >= TRUST.length}>
              <span className="flex size-5 items-center justify-center rounded-[3px] bg-brand-50 text-brand"><CheckIcon className="size-3" /></span>{item}
            </span>
          ))}
        </div>
      </section>

      {/* ---------- Products ---------- */}
      <section id="products" className="relative scroll-mt-24 bg-canvas py-24">
        <span id="borrow" className="absolute top-0" /><span id="save" className="absolute top-0" /><span id="invest" className="absolute top-0" /><span id="pay" className="absolute top-0" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="One account for your money" title={<>Borrow today. <span className="text-brand">Grow tomorrow.</span></>} text="Loans are live now. Savings, investments and payments are coming soon." />
          <Reveal className="mt-12"><ProductTabs borrow={borrow.tab} /></Reveal>
        </div>
      </section>

      {/* ---------- Loan facts, from the live products ---------- */}
      {facts && (
        <section className="py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
            {[
              { node: <CountUp value={facts.max >= 1_000_000 ? facts.max / 1_000_000 : facts.max / 1_000} prefix="₦" suffix={facts.max >= 1_000_000 ? "m" : "k"} decimals={Number.isInteger(facts.max >= 1_000_000 ? facts.max / 1_000_000 : facts.max / 1_000) ? 0 : 1} />, l: "The most you can borrow" },
              { node: <CountUp value={facts.maxTenor} suffix={facts.maxTenor === 1 ? " month" : " months"} />, l: "The longest time to repay" },
              { node: <CountUp value={facts.lowestRate} suffix="%" decimals={Number.isInteger(facts.lowestRate) ? 0 : 1} />, l: "Monthly interest, from" },
              { node: <>₦0</>, l: "Collateral needed" },
            ].map((stat, i) => (
              <Reveal key={stat.l} delay={i * 100} className="border-l-4 border-gold pl-5">
                <p className="font-display text-4xl font-extrabold text-brand sm:text-5xl">{stat.node}</p>
                <p className="mt-2 text-sm font-medium text-body">{stat.l}</p>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ---------- How it works ---------- */}
      <section id="how-it-works" className="scroll-mt-20 bg-canvas py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="How it works" title="From sign-up to money in your bank" text="Four steps to a loan, and what's coming next." />
          <div className="mt-8 lg:mt-0"><ScrollPhone borrowPoints={borrow.points} /></div>
        </div>
      </section>

      {/* ---------- Security ---------- */}
      <section id="security" className="relative scroll-mt-16 overflow-hidden bg-brand-950 py-24">
        <div className="diamond-pattern absolute inset-0 opacity-60" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:px-8">
          <div>
            <SectionHeading invert eyebrow="Security first" title="Your money is safe with us" text="Regulated lending, careful identity checks and trusted payment partners, so you can borrow with confidence." />
            <Reveal delay={150}>
              <div className="relative mt-10 flex size-48 items-center justify-center">
                <span className="pulse-ring absolute inset-6 rounded-full bg-brand/40" />
                <span className="absolute inset-0 rounded-full border border-white/10" />
                <span className="absolute inset-6 rounded-full border border-white/10" />
                <span className="flex size-24 items-center justify-center rounded-[7px] bg-brand text-white shadow-[0_20px_60px_-10px_rgba(1,80,200,.9)]"><ShieldIcon className="size-11" /></span>
              </div>
            </Reveal>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {SECURITY.map((item, i) => (
              <Reveal key={item.title} delay={i * 100}>
                <div className="h-full rounded-[7px] bg-white/[.05] p-7 ring-1 ring-white/10 backdrop-blur transition-colors hover:bg-white/[.08]">
                  <span className="flex size-12 items-center justify-center rounded-[7px] bg-gold/15 text-gold">{item.icon}</span>
                  <h3 className="mt-5 font-display text-lg font-bold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="scroll-mt-20 bg-canvas py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.5fr] lg:px-8">
          <div>
            <SectionHeading eyebrow="FAQ" title="Questions? We've got answers" />
            <Reveal delay={100}>
              <p className="mt-6 text-body">Can&apos;t find what you need? Email our support team at <a className="font-semibold text-brand" href={`mailto:${company.email}`}>{company.email}</a>{company.phone && <> or call <a className="font-semibold text-brand" href={`tel:${company.phone.replace(/\s/g, "")}`}>{company.phone}</a></>}.</p>
            </Reveal>
          </div>
          <div className="space-y-3">
            {faqs(facts, company.email).map((f, i) => (
              <Reveal key={f.q} delay={i * 60}>
                <details className="group rounded-[7px] bg-white ring-1 ring-line open:shadow-[0_20px_40px_-25px_rgba(6,31,77,.35)]">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 font-display font-bold text-ink">
                    {f.q}
                    <span className="faq-icon flex size-8 shrink-0 items-center justify-center rounded-[7px] bg-brand-50 text-brand transition-transform"><span className="text-xl leading-none">+</span></span>
                  </summary>
                  <p className="px-6 pb-6 leading-relaxed text-body">{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-7xl">
          <div className="gold-corner diamond-pattern relative overflow-hidden rounded-[7px] bg-brand px-8 py-16 text-white sm:px-14">
            <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">Your bigger possibilities start today.</h2>
                <p className="mt-4 max-w-xl text-lg text-white/80">Open a free account in minutes and see how much you can borrow.</p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link href="/register" className="flex items-center gap-2 rounded-[7px] bg-gold px-7 py-4 font-bold text-ink transition-transform hover:-translate-y-0.5">Open free account <ArrowRightIcon className="size-5" /></Link>
                  <Link href="/login" className="rounded-[7px] px-6 py-4 font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/10">Log in</Link>
                </div>
              </div>
              <ul className="space-y-3 text-sm">
                {["Free to open", "No collateral", "Full cost shown upfront", "Repay early, pay less"].map((b) => (
                  <li key={b} className="flex items-center gap-3 rounded-[7px] bg-white/10 px-5 py-3.5 font-semibold ring-1 ring-white/15">
                    <ZapIcon className="size-4 text-gold" />{b}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
