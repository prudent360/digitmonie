import Link from "next/link";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { buttonPrimary, buttonSecondary } from "@/components/ui";

/** A product that isn't live yet: what it will do, and a way back to what works today. */
export function ComingSoon({ icon, title, text, features }: { icon: React.ReactNode; title: string; text: string; features: string[] }) {
  return (
    <div className="mx-auto max-w-3xl">
      <section className="diamond-pattern gold-corner relative overflow-hidden rounded-[7px] bg-brand px-6 py-12 text-white sm:px-12">
        <div className="relative z-10">
          <span className="flex size-14 items-center justify-center rounded-[7px] bg-white/15 text-gold [&>svg]:size-7">{icon}</span>
          <p className="mt-6 inline-block rounded-[3px] bg-gold px-2.5 py-1 text-xs font-extrabold uppercase tracking-widest text-ink">Coming soon</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-xl text-lg leading-relaxed text-white/80">{text}</p>
        </div>
      </section>
      <section className="mt-6 rounded-[7px] border border-line bg-white p-6 sm:p-8">
        <h2 className="text-[15px] font-bold text-ink">What&apos;s on the way</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-3 text-sm text-body">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[7px] bg-brand-50 text-brand"><CheckIcon className="size-3" /></span>{f}
            </li>
          ))}
        </ul>
        <p className="mt-6 border-t border-line pt-5 text-sm text-muted">It isn&apos;t available yet. When it launches, it will appear right here in your account. In the meantime, you can apply for a loan.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/dashboard/loans" className={buttonPrimary}>Go to loans <ArrowRightIcon className="size-4" /></Link>
          <Link href="/dashboard" className={buttonSecondary}>Back to home</Link>
        </div>
      </section>
    </div>
  );
}
