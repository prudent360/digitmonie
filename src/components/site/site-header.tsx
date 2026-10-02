"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo, type Logos } from "@/components/logo";
import { MenuIcon, XIcon } from "@/components/icons";

const NAV = [
  { href: "/#save", label: "Save" },
  { href: "/#invest", label: "Invest" },
  { href: "/#borrow", label: "Borrow" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#security", label: "Security" },
];

/** Sits transparent over the blue hero, then turns solid white once the page scrolls. */
export function SiteHeader({ logos }: { logos: Logos }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || open;

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${solid ? "bg-white/95 shadow-[0_8px_30px_-12px_rgba(6,31,77,.18)] backdrop-blur" : "bg-transparent"}`}>
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo inverted={!solid} logos={logos} />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className={`rounded-[5px] px-4 py-2 text-sm font-semibold transition-colors ${solid ? "text-body hover:bg-brand-50 hover:text-brand" : "text-white/85 hover:bg-white/10 hover:text-white"}`}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/login" className={`rounded-[5px] px-5 py-2.5 text-sm font-semibold transition-colors ${solid ? "text-brand hover:bg-brand-50" : "text-white hover:bg-white/10"}`}>
            Log in
          </Link>
          <Link href="/register" className={`rounded-[5px] px-5 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5 ${solid ? "bg-brand text-white shadow-[0_10px_24px_-10px_rgba(1,80,200,.7)] hover:bg-brand-600" : "bg-gold text-ink hover:bg-gold-600"}`}>
            Open free account
          </Link>
        </div>

        <button type="button" onClick={() => setOpen((v) => !v)} className={`rounded-xl p-2 lg:hidden ${solid ? "text-ink" : "text-white"}`} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
          {open ? <XIcon className="size-6" /> : <MenuIcon className="size-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-white px-4 pb-6 pt-2 lg:hidden">
          <nav className="flex flex-col" aria-label="Mobile">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)} className="border-b border-line py-3.5 text-base font-semibold text-ink">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link href="/login" className="rounded-[5px] border border-line py-3 text-center text-sm font-semibold text-brand">Log in</Link>
            <Link href="/register" className="rounded-[5px] bg-brand py-3 text-center text-sm font-bold text-white">Open account</Link>
          </div>
        </div>
      )}
    </header>
  );
}
