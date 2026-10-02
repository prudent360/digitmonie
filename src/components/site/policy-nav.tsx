"use client";

import { useEffect, useState } from "react";

/** "On this page": numbered links that highlight the section being read. Collapses to a menu on phones. */
export function PolicyNav({ title, sections }: { title: string; sections: { id: string; title: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => Boolean(el));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const links = (
    <ol className="border-l border-line">
      {sections.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`} aria-current={active === s.id ? "location" : undefined}
            className={`-ml-px block border-l-2 py-2 pl-4 text-sm leading-5 transition ${active === s.id ? "border-brand font-semibold text-brand" : "border-transparent text-muted hover:border-brand-300 hover:text-ink"}`}>
            <span className="mr-1.5 font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>{s.title}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <>
      <details className="rounded-[7px] border border-line bg-white lg:hidden">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-bold text-ink">
          On this page <span className="text-xs font-semibold text-muted">{sections.length} sections</span>
        </summary>
        <nav aria-label={`${title} sections`} className="px-4 pb-3">{links}</nav>
      </details>
      <div className="hidden lg:block">
        <p className="font-display text-sm font-bold text-ink">On this page</p>
        <nav aria-label={`${title} sections`} className="mt-4">{links}</nav>
      </div>
    </>
  );
}
