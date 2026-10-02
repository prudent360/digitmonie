import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createPin } from "@/app/actions/auth";
import { PinForm } from "@/components/auth/forms";
import { LockIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/auth";
import { Steps } from "../../steps";

export const metadata: Metadata = { title: "Create your PIN" };

export default async function CreatePinPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role.kind !== "customer") redirect("/console");
  if (user.pinHash) redirect("/dashboard");
  return (
    <div className="page-in">
      <Steps current={3} />
      <span className="mt-6 flex size-12 items-center justify-center rounded-[7px] bg-brand-50 text-brand"><LockIcon /></span>
      <h1 className="mt-4 font-display text-3xl font-extrabold text-ink">Create your transaction PIN</h1>
      <p className="mt-2 text-body">You&apos;ll use this 4-digit PIN to approve transfers, loans and withdrawals. Don&apos;t use your birthday or share it with anyone.</p>
      <div className="mt-8"><PinForm action={createPin} /></div>
    </div>
  );
}
