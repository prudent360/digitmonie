import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { register } from "@/app/actions/auth";
import { RegisterForm } from "@/components/auth/forms";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { Steps } from "../steps";

export const metadata: Metadata = { title: "Open an account" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));

  return (
    <div className="page-in">
      <Steps current={1} />
      <h1 className="mt-6 font-display text-3xl font-extrabold text-ink">Open your free account</h1>
      <p className="mt-2 text-body">It takes less than 2 minutes. We&apos;ll text a code to your phone next.</p>
      <div className="mt-8"><RegisterForm action={register} /></div>
      <p className="mt-6 text-center text-sm text-body">Already have an account? <Link href="/login" className="font-semibold text-brand">Log in</Link></p>
    </div>
  );
}
