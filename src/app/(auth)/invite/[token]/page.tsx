import type { Metadata } from "next";
import Link from "next/link";
import { acceptInvite } from "@/app/actions/auth";
import { NewPasswordForm } from "@/components/auth/forms";
import { fullName, loadUser, staffTwoFactorRequired } from "@/lib/auth";
import { peekInviteToken } from "@/lib/tokens";

export const metadata: Metadata = { title: "Join the DigitMonie team" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const userId = await peekInviteToken(token);
  const user = userId ? await loadUser(userId) : null;

  if (!user) {
    return (
      <div className="page-in">
        <h1 className="font-display text-3xl font-extrabold text-ink">This invitation has expired</h1>
        <p className="mt-2 text-body">Invitations last 7 days and can only be used once. Ask an administrator to send you a new one.</p>
        <Link href="/login" className="mt-8 inline-block font-semibold text-brand">Go to log in</Link>
      </div>
    );
  }
  return (
    <div className="page-in">
      <p className="text-sm font-bold text-brand">Staff invitation · {user.role.name}</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-ink">Welcome, {user.firstName}</h1>
      <p className="mt-2 text-body">Create a password for <b className="text-ink">{user.email}</b>. {(await staffTwoFactorRequired()) && " Next you'll set up two-factor sign-in."}</p>
      <p className="sr-only">{fullName(user)}</p>
      <div className="mt-8"><NewPasswordForm action={acceptInvite.bind(null, token)} submit="Create password" /></div>
    </div>
  );
}
