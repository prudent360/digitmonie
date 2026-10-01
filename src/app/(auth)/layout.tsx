import { Logo, LogoMark } from "@/components/logo";
import { CheckIcon } from "@/components/icons";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <aside className="gold-corner diamond-pattern relative hidden flex-col justify-between overflow-hidden bg-brand p-12 text-white lg:flex">
        <Logo inverted />
        <div className="relative z-10">
          <LogoMark inverted className="size-14" />
          <h2 className="mt-8 max-w-md font-display text-4xl font-extrabold leading-tight">Simple Money.<br />Bigger Possibilities.</h2>
          <ul className="mt-8 space-y-3 text-white/80">
            {["Earn up to 21% p.a. on investments", "Loans in minutes, up to ₦50m", "NDIC-insured partner banks"].map((t) => (
              <li key={t} className="flex items-center gap-3"><span className="flex size-6 items-center justify-center rounded-full bg-gold text-ink"><CheckIcon className="size-3.5" /></span>{t}</li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-sm text-white/60">© {new Date().getFullYear()} DigitMonie · Lagos, Nigeria</p>
      </aside>
      <main className="flex flex-col justify-center px-4 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-10 lg:hidden"><Logo /></div>
          {children}
        </div>
      </main>
    </div>
  );
}
