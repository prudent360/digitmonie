import Link from "next/link";
import { Logo, type Logos } from "@/components/logo";

const COLUMNS = [
  { title: "Products", links: [["Savings", "/#save"], ["Investments", "/#invest"], ["Loans", "/#borrow"], ["Transfers & bills", "/#products"]] },
  { title: "Company", links: [["How it works", "/#how-it-works"], ["Security", "/#security"], ["Help & FAQ", "/#faq"], ["Contact us", "mailto:hello@digitmonie.com"]] },
  { title: "Legal", links: [["Terms of use", "/terms"], ["Privacy policy", "/privacy"], ["Loan terms", "/loan-terms"], ["Complaints", "/complaints"], ["Cookie policy", "/cookies"]] },
];

export function SiteFooter({ logos }: { logos: Logos }) {
  return (
    <footer className="bg-brand-950 text-white/70">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo inverted logos={logos} />
            <p className="mt-4 max-w-xs text-sm leading-relaxed">Simple Money. Bigger Possibilities.</p>
            <address className="mt-6 text-sm not-italic leading-relaxed">
              123 Innovation Drive<br />Victoria Island, Lagos, Nigeria<br />
              <a href="mailto:hello@digitmonie.com" className="text-white hover:text-gold">hello@digitmonie.com</a>
            </address>
          </div>
          {COLUMNS.map((col) => (
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
          <p>DigitMonie is licensed by the Federal Competition and Consumer Protection Commission (FCCPC) as a digital lender. Banking services are provided by licensed partner institutions. Deposits are insured by the NDIC up to the applicable limit. Investments carry risk; past returns do not guarantee future performance.</p>
          <p className="mt-3">© {new Date().getFullYear()} DigitMonie. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
