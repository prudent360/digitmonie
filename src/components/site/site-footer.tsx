import Link from "next/link";
import { Logo, type Logos } from "@/components/logo";

export type FooterCompany = { company: string; rc: string; address: string; email: string; phone: string; licence: string };

const PRODUCTS: [string, string, boolean][] = [["Loans", "/#borrow", false], ["Savings", "/#save", true], ["Investments", "/#invest", true], ["Transfers & bills", "/#pay", true]];
const LEGAL = [["Terms of use", "/terms"], ["Privacy policy", "/privacy"], ["Loan terms", "/loan-terms"], ["Complaints", "/complaints"], ["Cookie policy", "/cookies"]];

export function SiteFooter({ logos, company: c }: { logos: Logos; company: FooterCompany }) {
  const columns = [
    { title: "Company", links: [["How it works", "/#how-it-works"], ["Security", "/#security"], ["Help & FAQ", "/#faq"], ["Contact us", `mailto:${c.email}`]] },
    { title: "Legal", links: LEGAL },
  ];
  return (
    <footer className="bg-brand-950 text-white/70 print:hidden">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo inverted logos={logos} />
            <p className="mt-4 max-w-xs text-sm leading-relaxed">Simple Money. Bigger Possibilities.</p>
            <address className="mt-6 text-sm not-italic leading-relaxed">
              {c.address && <span className="block whitespace-pre-line">{c.address}</span>}
              <a href={`mailto:${c.email}`} className="text-white hover:text-gold">{c.email}</a>
              {c.phone && <><br /><a href={`tel:${c.phone.replace(/\s/g, "")}`} className="text-white hover:text-gold">{c.phone}</a></>}
            </address>
          </div>
          <div>
            <p className="font-display text-sm font-bold text-white">Products</p>
            <ul className="mt-4 space-y-3 text-sm">
              {PRODUCTS.map(([label, href, soon]) => (
                <li key={label}>
                  <Link href={href} className="transition-colors hover:text-gold">{label}</Link>
                  {soon && <span className="ml-2 rounded-[3px] bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">Soon</span>}
                </li>
              ))}
            </ul>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="font-display text-sm font-bold text-white">{col.title}</p>
              <ul className="mt-4 space-y-3 text-sm">
                {col.links.map(([label, href]) => (
                  <li key={label}><Link href={href} className="transition-colors hover:text-gold">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 border-t border-white/10 pt-8 text-xs leading-relaxed text-white/50">
          <p>{c.company}{c.rc && ` (RC ${c.rc})`} is licensed by the Federal Competition and Consumer Protection Commission (FCCPC) as a digital lender{c.licence && `, licence ${c.licence}`}. DigitMonie is not a bank and does not take deposits. Savings, investments, transfers and bill payments are not yet available; when they launch, they will be provided with licensed partners.</p>
          <p className="mt-3">© {new Date().getFullYear()} {c.company}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
