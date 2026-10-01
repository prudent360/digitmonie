"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/actions/auth";
import { Logo, LogoMark } from "@/components/logo";
import { BellIcon, LogoutIcon, MenuIcon, SearchIcon, XIcon } from "@/components/icons";
import { Avatar } from "@/components/ui";

export type NavItem = { href: string; label: string; icon: React.ReactNode; badge?: string };
export type NavSection = { title?: string; items: NavItem[] };

type Props = {
  variant: "customer" | "console";
  sections: NavSection[];
  user: { name: string; email: string; roleLabel: string };
  switchLink?: { href: string; label: string };
  children: React.ReactNode;
};

function isActive(pathname: string, href: string) {
  const root = href.split("/").length === 2;
  return root ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/** Sidebar + top bar. The customer app is light; the staff/admin console uses a dark sidebar. */
export function AppShell({ variant, sections, user, switchLink, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dark = variant === "console";

  const sidebar = (
    <div className={`flex h-full flex-col ${dark ? "bg-brand-950 text-white/70" : "bg-white text-body"}`}>
      <div className="flex h-16 items-center justify-between px-5">
        <Logo href={dark ? "/console" : "/dashboard"} inverted={dark} />
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 lg:hidden" aria-label="Close menu"><XIcon /></button>
      </div>
      {dark && <p className="mx-5 mb-2 w-fit rounded-md bg-gold px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-ink">Console</p>}

      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-3" aria-label="Sidebar">
        {sections.map((section, i) => (
          <div key={i} className="mb-5">
            {section.title && <p className={`mb-2 px-3 text-[11px] font-bold uppercase tracking-wider ${dark ? "text-white/35" : "text-muted/80"}`}>{section.title}</p>}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                const tone = active
                  ? dark ? "bg-white/10 text-white" : "bg-brand text-white shadow-[0_10px_20px_-12px_rgba(1,80,200,.9)]"
                  : dark ? "hover:bg-white/5 hover:text-white" : "hover:bg-brand-50 hover:text-brand";
                return (
                  <li key={item.href}>
                    <Link href={item.href} onClick={() => setOpen(false)} className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${tone}`} aria-current={active ? "page" : undefined}>
                      {active && dark && <span className="absolute -left-3 top-2 h-6 w-1 rounded-r-full bg-gold" />}
                      {item.icon}
                      <span className="flex-1">{item.label}</span>
                      {item.badge && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${active && !dark ? "bg-white text-brand" : "bg-gold text-ink"}`}>{item.badge}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={`m-3 rounded-2xl p-3 ${dark ? "bg-white/5" : "bg-canvas"}`}>
        <div className="flex items-center gap-3">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className={`truncate text-sm font-bold ${dark ? "text-white" : "text-ink"}`}>{user.name}</p>
            <p className="truncate text-xs">{user.roleLabel}</p>
          </div>
          <form action={signOut}>
            <button className={`rounded-lg p-2 transition ${dark ? "hover:bg-white/10 hover:text-white" : "hover:bg-white hover:text-danger"}`} aria-label="Sign out" title="Sign out"><LogoutIcon className="size-4" /></button>
          </form>
        </div>
        {switchLink && (
          <Link href={switchLink.href} className={`mt-3 block rounded-xl py-2 text-center text-xs font-bold ${dark ? "bg-white/10 text-white hover:bg-white/15" : "bg-white text-brand ring-1 ring-line"}`}>{switchLink.label}</Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-canvas">
      <aside className={`fixed inset-y-0 left-0 z-40 hidden w-64 lg:block ${dark ? "" : "border-r border-line"}`}>{sidebar}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Close menu" />
          <aside className="page-in absolute inset-y-0 left-0 w-72 shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 text-ink lg:hidden" aria-label="Open menu"><MenuIcon /></button>
          <Link href={dark ? "/console" : "/dashboard"} className="lg:hidden" aria-label="Home"><LogoMark className="size-8" /></Link>
          <label className="relative hidden max-w-md flex-1 sm:block">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input type="search" placeholder={dark ? "Search customers, references, loans…" : "Search transactions…"} className="w-full rounded-xl border border-line bg-canvas py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand-100" />
          </label>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" className="relative rounded-xl p-2.5 text-body transition hover:bg-canvas" aria-label="Notifications">
              <BellIcon />
              <span className="absolute right-2 top-2 size-2 rounded-full bg-danger ring-2 ring-white" />
            </button>
            <Avatar name={user.name} className="size-9 text-xs" />
          </div>
        </header>
        <main className="page-in mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
