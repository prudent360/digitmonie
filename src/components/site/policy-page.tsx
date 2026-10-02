import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon, ShieldIcon } from "@/components/icons";
import { PolicyNav } from "./policy-nav";

export type PolicySection = { id: string; title: string; content: ReactNode };

export const POLICIES = [
  { href: "/terms", label: "Terms of Use" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/loan-terms", label: "Loan Terms" },
  { href: "/complaints", label: "Complaints" },
  { href: "/cookies", label: "Cookie Policy" },
];

/** Shared layout for the legal pages: hero, sticky numbered contents, numbered sections, help box, other policies. */
export function PolicyPage({ title, summary, updated, intro, sections, current, supportEmail }: {
  title: string;
  summary: string;
  updated: string;
  intro: ReactNode;
  sections: PolicySection[];
  current: string;
  supportEmail: string;
}) {
  const readMinutes = Math.max(3, Math.ceil(sections.length * 0.7));
  return (
    <>
      <section className="diamond-pattern relative overflow-hidden bg-brand pb-16 pt-32 text-white sm:pt-36">
        <div className="absolute -bottom-10 -right-20 h-20 w-[420px] -rotate-[20deg] bg-gold max-sm:hidden" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
          <p className="flex items-center gap-3 text-sm font-bold text-white/80"><span className="h-[3px] w-8 bg-gold" />Legal</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/80">{summary}</p>
          <p className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
            <span>Last updated {updated}</span><span aria-hidden="true">·</span><span>About {readMinutes} min read</span><span aria-hidden="true">·</span><span>{sections.length} sections</span>
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14 lg:px-8">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <PolicyNav title={title} sections={sections.map(({ id, title }) => ({ id, title }))} />
        </aside>

        <article className="min-w-0">
          <div className="flex gap-3 rounded-[7px] border border-brand-100 bg-brand-50/60 p-5 text-[15px] leading-7 text-body">
            <ShieldIcon className="mt-1 size-5 shrink-0 text-brand" />
            <div>{intro}</div>
          </div>
          <div className="mt-10 divide-y divide-line border-t border-line">
            {sections.map((section, i) => (
              <section key={section.id} id={section.id} className="scroll-mt-28 py-9 first:pt-8">
                <p className="font-mono text-xs font-semibold text-brand">{String(i + 1).padStart(2, "0")}</p>
                <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink md:text-[28px]">{section.title}</h2>
                <div className="policy-copy mt-4 text-[16px] leading-7 text-body">{section.content}</div>
              </section>
            ))}
          </div>

          <div className="relative mt-4 overflow-hidden rounded-[7px] bg-brand-950 p-6 text-white md:p-8">
            <div className="diamond-pattern absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative">
              <p className="font-display text-xl font-bold">Questions about this document?</p>
              <p className="mt-2 max-w-xl text-[15px] leading-6 text-white/70">We&apos;re happy to explain how it applies to your account or loan.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href={`mailto:${supportEmail}`} className="inline-flex items-center gap-2 rounded-[7px] bg-white px-5 py-3 text-sm font-bold text-brand hover:bg-gold hover:text-ink">Email {supportEmail} <ArrowRightIcon className="size-4" /></a>
                <Link href="/complaints" className="inline-flex items-center rounded-[7px] px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/10">Make a complaint</Link>
              </div>
            </div>
          </div>

          <nav aria-label="Other policies" className="mt-8 flex flex-wrap gap-2">
            {POLICIES.map((p) => (
              <Link key={p.href} href={p.href} aria-current={p.href === current ? "page" : undefined}
                className={`rounded-[7px] px-3.5 py-2 text-sm font-semibold ${p.href === current ? "bg-brand text-white" : "bg-canvas text-body hover:text-brand"}`}>{p.label}</Link>
            ))}
          </nav>
        </article>
      </div>
    </>
  );
}
