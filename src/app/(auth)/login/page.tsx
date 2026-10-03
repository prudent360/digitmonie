import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import { LoginForm } from "@/components/auth/forms";
import { getCurrentUser, homeFor, safeNextPath } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string; expired?: string; next?: string }> }) {
  const { reset, expired, next: nextParam } = await searchParams;
  const next = safeNextPath(nextParam);
  const user = await getCurrentUser();
  if (user) {
    // Still signed in (another tab kept the session going): carry on where they were.
    const home = homeFor(user);
    redirect(next && next.startsWith(home) ? next : home);
  }

  return (
    <div className="page-in">
      <h1 className="font-display text-3xl font-extrabold text-ink">Welcome back</h1>
      <p className="mt-2 text-body">Log in to manage your money.</p>
      {expired && <p role="status" className="mt-6 rounded-[7px] bg-warning-soft px-4 py-3 text-sm font-medium text-warning">You were signed out to keep your account safe. Log in again to carry on{next ? " where you left off" : ""}.</p>}
      {reset && <p className="mt-6 rounded-[7px] bg-success-soft px-4 py-3 text-sm font-medium text-success">Your password has been changed. Log in with your new password.</p>}
      <div className="mt-8"><LoginForm action={login} next={next} /></div>
      <p className="mt-6 text-center text-sm text-body">New to DigitMonie? <Link href="/register" className="font-semibold text-brand">Open an account</Link></p>
    </div>
  );
}
