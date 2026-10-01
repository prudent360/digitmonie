import type { Metadata } from "next";
import Link from "next/link";
import { demoSignIn } from "@/app/actions/auth";
import { Field, inputClass } from "@/components/form";
import { ArrowRightIcon, ShieldIcon, UserCogIcon, UsersIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Log in" };

const DEMO_ROLES = [
  { role: "customer", label: "Customer", text: "Wallet, savings, investments & loans", icon: <UsersIcon className="size-5" /> },
  { role: "staff", label: "Staff", text: "KYC reviews, loan queue, customers", icon: <UserCogIcon className="size-5" /> },
  { role: "admin", label: "Admin", text: "Everything, plus products & team", icon: <ShieldIcon className="size-5" /> },
];

export default function LoginPage() {
  return (
    <div className="page-in">
      <h1 className="font-display text-3xl font-extrabold text-ink">Welcome back</h1>
      <p className="mt-2 text-body">Log in to manage your money.</p>

      <form action={demoSignIn} className="mt-8 space-y-5">
        <input type="hidden" name="role" value="customer" />
        <Field label="Email or phone number">
          <input className={inputClass} type="text" name="identifier" placeholder="you@example.com" autoComplete="username" />
        </Field>
        <Field label="Password" hint={<Link href="#" className="text-xs font-semibold text-brand">Forgot password?</Link>}>
          <input className={inputClass} type="password" name="password" placeholder="••••••••" autoComplete="current-password" />
        </Field>
        <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 font-bold text-white transition hover:bg-brand-600">
          Log in <ArrowRightIcon className="size-4" />
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-body">New to DigitMonie? <Link href="/register" className="font-semibold text-brand">Open an account</Link></p>

      <div className="mt-10 rounded-2xl border border-dashed border-brand-200 bg-brand-50/60 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-brand">Preview mode · explore as</p>
        <div className="mt-4 space-y-2">
          {DEMO_ROLES.map((d) => (
            <form key={d.role} action={demoSignIn}>
              <input type="hidden" name="role" value={d.role} />
              <button className="group flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left ring-1 ring-line transition hover:ring-brand">
                <span className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand">{d.icon}</span>
                <span className="flex-1"><span className="block text-sm font-bold text-ink">{d.label}</span><span className="block text-xs text-muted">{d.text}</span></span>
                <ArrowRightIcon className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
