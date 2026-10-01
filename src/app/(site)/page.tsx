import Link from "next/link";
import { CountUp } from "@/components/site/count-up";
import { HeroPhone } from "@/components/site/hero-phone";
import { HowItWorks } from "@/components/site/how-it-works";
import { Reveal } from "@/components/site/reveal";
import { LogoMark } from "@/components/logo";
import {
  ArrowRightIcon, BoltIcon, CardIcon, CheckIcon, FingerprintIcon, LandmarkIcon,
  LockIcon, PiggyIcon, ReceiptIcon, ShieldIcon, StarIcon, TrendUpIcon, ZapIcon,
} from "@/components/icons";

const TRUST = ["NDIC-insured deposits", "CBN-licensed partner bank", "SEC-registered fund manager", "PCI-DSS certified", "NDPR compliant", "256-bit encryption", "BVN & NIN verified"];

const SECURITY = [
  { title: "Your money is protected", text: "Deposits sit with CBN-licensed partner banks and are insured by the NDIC.", icon: <ShieldIcon className="size-6" /> },
  { title: "Bank-grade encryption", text: "Every transaction and every piece of data is encrypted end to end.", icon: <LockIcon className="size-6" /> },
  { title: "Biometric & 2FA", text: "Face ID, fingerprint and one-time PINs keep strangers out.", icon: <FingerprintIcon className="size-6" /> },
  { title: "24/7 fraud monitoring", text: "Real-time checks flag unusual activity before it becomes a problem.", icon: <BoltIcon className="size-6" /> },
];

const TESTIMONIALS = [
  { name: "Chiamaka O.", role: "Product designer, Lagos", text: "I finally stopped touching my rent money. The Rent Vault locks it away and the interest is a nice bonus." },
  { name: "Ibrahim S.", role: "Shop owner, Kano", text: "Got working capital for my store in one afternoon. No queues, no endless paperwork." },
  { name: "Tolu A.", role: "Software engineer, Remote", text: "The Fixed Note rates beat my bank by miles and I can see exactly what I'll earn before I commit." },
  { name: "Blessing E.", role: "Nurse, Uyo", text: "Paying bills and sending money to family is instant. The app is honestly a joy to use." },
  { name: "Kelechi N.", role: "Student, Enugu", text: "I started saving ₦5,000 a week. Watching the goal ring fill up keeps me disciplined." },
  { name: "Funmi B.", role: "Consultant, Abuja", text: "Treasury bills used to feel complicated. Here it's three taps and I'm done." },
];

const FAQS = [
  { q: "Is my money safe with DigitMonie?", a: "Yes. Customer deposits are held with CBN-licensed partner banks and insured by the NDIC up to the applicable limit. We also use bank-grade encryption, biometric login and 24/7 fraud monitoring." },
  { q: "How much do I need to start investing?", a: "You can start with as little as ₦5,000 in the Naira Money Market Fund. Fixed Notes start from ₦100,000." },
  { q: "How quickly can I get a loan?", a: "Most eligible applications are reviewed in minutes, and approved loans are paid straight into your DigitMonie wallet." },
  { q: "Can I withdraw my savings early?", a: "Flexible savings can be withdrawn anytime. Locked goals like the Rent Vault can only be broken early with a small fee, which helps you stay disciplined." },
  { q: "What do I need to open an account?", a: "Your phone number, BVN and a selfie. Higher account tiers need your NIN and a proof of address." },
  { q: "Are there charges on transfers?", a: "You get free transfers every month. After that, standard NIP charges apply and are always shown before you confirm." },
];

function SectionHeading({ eyebrow, title, text, center = false, invert = false }: { eyebrow: string; title: React.ReactNode; text?: string; center?: boolean; invert?: boolean }) {
  return (
    <Reveal className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <p className={`text-sm font-bold uppercase tracking-[.16em] ${invert ? "text-gold" : "text-brand"}`}>{eyebrow}</p>
      <h2 className={`mt-3 font-display text-3xl font-extrabold leading-tight sm:text-[2.6rem] ${invert ? "text-white" : "text-ink"}`}>{title}</h2>
      {text && <p className={`mt-4 text-lg leading-relaxed ${invert ? "text-white/70" : "text-body"}`}>{text}</p>}
    </Reveal>
  );
}

export default function HomePage() {
  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="diamond-pattern relative overflow-hidden bg-brand pb-24 pt-32 text-white sm:pt-36">
        <div className="absolute -left-40 top-10 size-[520px] rounded-full bg-brand-400/30 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:px-8">
          <div>
            <p className="rise-in inline-flex items-center gap-2 rounded-full bg-white/10 py-1.5 pl-1.5 pr-4 text-sm font-semibold ring-1 ring-white/20">
              <span className="rounded-full bg-gold px-2.5 py-0.5 text-xs font-bold text-ink">New</span>
              Earn up to 21% p.a. on Fixed Notes
            </p>
            <h1 className="rise-in mt-6 font-display text-[2.6rem] font-extrabold leading-[1.05] sm:text-6xl lg:text-[3.4rem] xl:text-[3.9rem]" style={{ animationDelay: "100ms" }}>
              Simple money.
              <br />
              <span className="relative inline-block sm:whitespace-nowrap">
                Bigger possibilities.
                <svg viewBox="0 0 300 12" className="absolute -bottom-2 left-0 w-full" aria-hidden="true" preserveAspectRatio="none">
                  <path d="M2 9 Q150 -2 298 7" fill="none" stroke="#f0ca56" strokeWidth="5" strokeLinecap="round" className="draw-line" />
                </svg>
              </span>
            </h1>
            <p className="rise-in mt-7 max-w-xl text-lg leading-relaxed text-white/80" style={{ animationDelay: "200ms" }}>
              Save towards your goals, invest in high-yield Naira products and get loans in minutes, all from one secure account built for Nigerians.
            </p>
            <div className="rise-in mt-9 flex flex-wrap items-center gap-4" style={{ animationDelay: "300ms" }}>
              <Link href="/register" className="group flex items-center gap-2 rounded-full bg-gold px-7 py-4 text-base font-bold text-ink shadow-[0_18px_40px_-16px_rgba(240,202,86,.9)] transition-all hover:-translate-y-0.5 hover:bg-gold-600">
                Open a free account <ArrowRightIcon className="size-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a href="#how-it-works" className="rounded-full px-6 py-4 text-base font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/10">See how it works</a>
            </div>
            <div className="rise-in mt-10 flex flex-wrap items-center gap-6" style={{ animationDelay: "400ms" }}>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {["AO", "IS", "TB", "GE"].map((i, n) => (
                    <span key={i} className={`flex size-9 items-center justify-center rounded-full text-[11px] font-bold ring-2 ring-brand ${["bg-gold text-ink", "bg-white text-brand", "bg-brand-300 text-white", "bg-brand-800 text-white"][n]}`}>{i}</span>
                  ))}
                </div>
                <div className="text-sm">
                  <span className="flex text-gold">{Array.from({ length: 5 }, (_, i) => <StarIcon key={i} className="size-3.5" />)}</span>
                  <span className="text-white/75">4.8 from 12k+ reviews</span>
                </div>
              </div>
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
            <span key={i} className="flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-body" aria-hidden={i >= TRUST.length}>
              <span className="flex size-5 items-center justify-center rounded-full bg-brand-50 text-brand"><CheckIcon className="size-3" /></span>{item}
            </span>
          ))}
        </div>
      </section>

      {/* ---------- Products bento ---------- */}
      <section id="products" className="scroll-mt-24 bg-canvas py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="One account, everything money" title={<>Everything you need to <span className="text-brand">grow your money</span></>} text="From your first ₦5,000 saved to your first million invested, DigitMonie moves with you." />

          <div className="mt-14 grid gap-5 lg:grid-cols-6">
            {/* Save */}
            <Reveal className="lg:col-span-3" >
              <article id="save" className="group h-full scroll-mt-28 overflow-hidden rounded-[5px] bg-white p-8 ring-1 ring-line transition-shadow hover:shadow-[0_30px_60px_-30px_rgba(6,31,77,.35)]">
                <span className="flex size-12 items-center justify-center rounded-[5px] bg-brand-50 text-brand"><PiggyIcon className="size-6" /></span>
                <h3 className="mt-5 font-display text-2xl font-bold text-ink">Save with purpose</h3>
                <p className="mt-2 max-w-md text-body">Lock funds for rent, school fees or that trip. Automate deposits and earn up to 14% p.a.</p>
                <div className="mt-8 space-y-3">
                  {[{ n: "Rent Vault", p: 64, v: "₦1.15m / ₦1.8m" }, { n: "Emergency fund", p: 82, v: "₦820k / ₦1m" }, { n: "Japa fund", p: 28, v: "₦1.4m / ₦5m" }].map((g, i) => (
                    <div key={g.n} className="rounded-[5px] bg-canvas p-4">
                      <div className="flex justify-between text-sm"><span className="font-semibold text-ink">{g.n}</span><span className="text-muted">{g.v}</span></div>
                      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-brand-100">
                        <div className="h-full origin-left rounded-full bg-brand transition-transform duration-1000 group-hover:scale-x-105" style={{ width: `${g.p}%`, transitionDelay: `${i * 80}ms` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </Reveal>

            {/* Invest */}
            <Reveal className="lg:col-span-3" delay={100}>
              <article id="invest" className="relative h-full scroll-mt-28 overflow-hidden rounded-[5px] bg-brand-900 p-8 text-white">
                <span className="flex size-12 items-center justify-center rounded-[5px] bg-white/10 text-gold"><TrendUpIcon className="size-6" /></span>
                <h3 className="mt-5 font-display text-2xl font-bold">Invest with confidence</h3>
                <p className="mt-2 max-w-md text-white/70">Fixed Notes, Treasury bills and money market funds, vetted by our investment team.</p>
                <div className="mt-8 grid grid-cols-3 gap-3">
                  {[{ n: "Fixed Note", r: "21%" }, { n: "T-bills", r: "18.5%" }, { n: "Money market", r: "19.2%" }].map((p) => (
                    <div key={p.n} className="rounded-[5px] bg-white/[.07] p-4 ring-1 ring-white/10">
                      <p className="font-display text-2xl font-extrabold text-gold">{p.r}</p>
                      <p className="mt-1 text-xs text-white/70">{p.n} · p.a.</p>
                    </div>
                  ))}
                </div>
                <svg viewBox="0 0 400 90" className="mt-6 h-24 w-full" aria-hidden="true">
                  <path d="M0 80 C60 70 90 75 130 58 S210 50 250 34 S330 20 400 6" fill="none" stroke="#f0ca56" strokeWidth="3" strokeLinecap="round" />
                  <path d="M0 80 C60 70 90 75 130 58 S210 50 250 34 S330 20 400 6 V90 H0Z" fill="url(#gold-fade)" />
                  <defs><linearGradient id="gold-fade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#f0ca56" stopOpacity=".3" /><stop offset="1" stopColor="#f0ca56" stopOpacity="0" /></linearGradient></defs>
                </svg>
              </article>
            </Reveal>

            {/* Borrow */}
            <Reveal className="lg:col-span-2" delay={0}>
              <article id="borrow" className="h-full scroll-mt-28 rounded-[5px] bg-white p-8 ring-1 ring-line">
                <span className="flex size-12 items-center justify-center rounded-[5px] bg-gold-100 text-gold-700"><LandmarkIcon className="size-6" /></span>
                <h3 className="mt-5 font-display text-2xl font-bold text-ink">Loans in minutes</h3>
                <p className="mt-2 text-body">Personal and SME loans up to ₦50m. No collateral for most customers.</p>
                <div className="mt-7 rounded-[5px] bg-canvas p-4">
                  <div className="flex items-center gap-3">
                    <span className="relative flex size-10 items-center justify-center rounded-full bg-success text-white">
                      <span className="pulse-ring absolute inset-0 rounded-full bg-success" />
                      <CheckIcon className="relative size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink">₦750,000 approved</p>
                      <p className="text-xs text-muted">Disbursed to wallet · 4 mins</p>
                    </div>
                  </div>
                </div>
              </article>
            </Reveal>

            {/* Pay */}
            <Reveal className="lg:col-span-2" delay={100}>
              <article className="h-full rounded-[5px] bg-white p-8 ring-1 ring-line">
                <span className="flex size-12 items-center justify-center rounded-[5px] bg-brand-50 text-brand"><ReceiptIcon className="size-6" /></span>
                <h3 className="mt-5 font-display text-2xl font-bold text-ink">Transfers & bills</h3>
                <p className="mt-2 text-body">Free monthly transfers. Airtime, data, power and TV in seconds.</p>
                <div className="mt-7 flex flex-wrap gap-2">
                  {["MTN", "Airtel", "Glo", "DStv", "IKEDC", "AEDC", "GOtv", "9mobile"].map((b) => (
                    <span key={b} className="rounded-[5px] bg-canvas px-3 py-1.5 text-xs font-semibold text-body">{b}</span>
                  ))}
                </div>
              </article>
            </Reveal>

            {/* Cards */}
            <Reveal className="lg:col-span-2" delay={200}>
              <article className="h-full overflow-hidden rounded-[5px] bg-gold p-8">
                <span className="flex size-12 items-center justify-center rounded-[5px] bg-white/50 text-ink"><CardIcon className="size-6" /></span>
                <h3 className="mt-5 font-display text-2xl font-bold text-ink">Virtual cards</h3>
                <p className="mt-2 text-ink/75">Shop online and pay subscriptions safely with Naira virtual cards.</p>
                <div className="diamond-pattern mt-7 -mb-14 ml-6 rotate-[-6deg] rounded-[5px] bg-brand p-5 text-white shadow-2xl transition-transform hover:rotate-0">
                  <div className="flex items-center justify-between"><LogoMark inverted className="size-7" /><span className="text-xs font-bold italic">VERVE</span></div>
                  <p className="mt-6 font-mono text-sm tracking-[.2em]">•••• •••• •••• 4821</p>
                  <p className="mt-2 text-[11px] text-white/70">ADAEZE OKAFOR</p>
                </div>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- Stats ---------- */}
      <section className="py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            { v: 250, s: "k+", l: "Nigerians trust us" },
            { v: 18.4, s: "bn", p: "₦", d: 1, l: "Assets under management" },
            { v: 6.9, s: "bn", p: "₦", d: 1, l: "Loans disbursed" },
            { v: 4, s: " mins", l: "Average loan decision" },
          ].map((stat, i) => (
            <Reveal key={stat.l} delay={i * 100} className="border-l-4 border-gold pl-5">
              <p className="font-display text-4xl font-extrabold text-brand sm:text-5xl"><CountUp value={stat.v} prefix={stat.p} suffix={stat.s} decimals={stat.d ?? 0} /></p>
              <p className="mt-2 text-sm font-medium text-body">{stat.l}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how-it-works" className="scroll-mt-20 bg-canvas py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="How it works" title="Everything in one place" text="Here's what you get the moment you sign in." />
          <Reveal className="mt-14"><HowItWorks /></Reveal>
        </div>
      </section>

      {/* ---------- Security ---------- */}
      <section id="security" className="relative scroll-mt-16 overflow-hidden bg-brand-950 py-24">
        <div className="diamond-pattern absolute inset-0 opacity-60" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:px-8">
          <div>
            <SectionHeading invert eyebrow="Security first" title="Your money is safe with us" text="We combine regulated partners, strong encryption and real-time monitoring so you can grow your money with peace of mind." />
            <Reveal delay={150}>
              <div className="relative mt-10 flex size-48 items-center justify-center">
                <span className="pulse-ring absolute inset-6 rounded-full bg-brand/40" />
                <span className="absolute inset-0 rounded-full border border-white/10" />
                <span className="absolute inset-6 rounded-full border border-white/10" />
                <span className="flex size-24 items-center justify-center rounded-[28px] bg-brand text-white shadow-[0_20px_60px_-10px_rgba(1,80,200,.9)]"><ShieldIcon className="size-11" /></span>
              </div>
            </Reveal>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {SECURITY.map((item, i) => (
              <Reveal key={item.title} delay={i * 100}>
                <div className="h-full rounded-3xl bg-white/[.05] p-7 ring-1 ring-white/10 backdrop-blur transition-colors hover:bg-white/[.08]">
                  <span className="flex size-12 items-center justify-center rounded-2xl bg-gold/15 text-gold">{item.icon}</span>
                  <h3 className="mt-5 font-display text-lg font-bold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{item.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Testimonials ---------- */}
      <section className="overflow-hidden py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading center eyebrow="Loved across Nigeria" title="Clever money moves, real people" />
        </div>
        <div className="mt-14 flex w-max animate-marquee gap-5 hover:[animation-play-state:paused]" style={{ animationDuration: "60s" }}>
          {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
            <figure key={i} className="w-[340px] shrink-0 rounded-3xl bg-canvas p-7" aria-hidden={i >= TESTIMONIALS.length}>
              <span className="flex text-gold">{Array.from({ length: 5 }, (_, s) => <StarIcon key={s} className="size-4" />)}</span>
              <blockquote className="mt-4 text-[15px] leading-relaxed text-ink">“{t.text}”</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{t.name[0]}</span>
                <span><span className="block text-sm font-bold text-ink">{t.name}</span><span className="block text-xs text-muted">{t.role}</span></span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="scroll-mt-20 bg-canvas py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.5fr] lg:px-8">
          <div>
            <SectionHeading eyebrow="FAQ" title="Questions? We've got answers" />
            <Reveal delay={100}>
              <p className="mt-6 text-body">Can&apos;t find what you need? Our support team is available 24/7 by live chat or at <a className="font-semibold text-brand" href="mailto:hello@digitmonie.com">hello@digitmonie.com</a>.</p>
            </Reveal>
          </div>
          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <Reveal key={f.q} delay={i * 60}>
                <details className="group rounded-2xl bg-white ring-1 ring-line open:shadow-[0_20px_40px_-25px_rgba(6,31,77,.35)]">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 font-display font-bold text-ink">
                    {f.q}
                    <span className="faq-icon flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand transition-transform"><span className="text-xl leading-none">+</span></span>
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
          <div className="gold-corner diamond-pattern relative overflow-hidden rounded-[36px] bg-brand px-8 py-16 text-white sm:px-14">
            <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
              <div>
                <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">Your bigger possibilities start today.</h2>
                <p className="mt-4 max-w-xl text-lg text-white/80">Open a free account in minutes and get ₦1,000 bonus when you save your first ₦10,000.</p>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link href="/register" className="flex items-center gap-2 rounded-full bg-gold px-7 py-4 font-bold text-ink transition-transform hover:-translate-y-0.5">Open free account <ArrowRightIcon className="size-5" /></Link>
                  <Link href="/login" className="rounded-full px-6 py-4 font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/10">Log in</Link>
                </div>
              </div>
              <ul className="space-y-3 text-sm">
                {["No account maintenance fees", "Free transfers every month", "Daily interest on savings", "Support 24/7, 365 days"].map((b) => (
                  <li key={b} className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-3.5 font-semibold ring-1 ring-white/15">
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
