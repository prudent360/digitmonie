import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { login } from "@/app/actions/auth";
import { LoginForm } from "@/components/auth/forms";
import { getCurrentUser, homeFor } from "@/lib/auth";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));
  const { reset } = await searchParams;

  return (
    <div className="page-in">
      <h1 className="font-display text-3xl font-extrabold text-ink">Welcome back</h1>
      <p className="mt-2 text-body">Log in to manage your money.</p>
      {reset && <p className="mt-6 rounded-[5px] bg-success-soft px-4 py-3 text-sm font-medium text-success">Your password has been changed. Log in with your new password.</p>}
      <div className="mt-8"><LoginForm action={login} /></div>
      <p className="mt-6 text-center text-sm text-body">New to DigitMonie? <Link href="/register" className="font-semibold text-brand">Open an account</Link></p>
    </div>
  );
}
