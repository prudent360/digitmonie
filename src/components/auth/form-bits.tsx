"use client";

import { useFormStatus } from "react-dom";
import { AlertIcon, ArrowRightIcon, CheckIcon } from "@/components/icons";

export function SubmitButton({ children, className = "", arrow = true, tone = "brand" }: { children: React.ReactNode; className?: string; arrow?: boolean; tone?: "brand" | "danger" }) {
  const { pending } = useFormStatus();
  const colours = tone === "danger" ? "bg-danger hover:brightness-110" : "bg-brand hover:bg-brand-600";
  return (
    <button disabled={pending} className={`flex w-full items-center justify-center gap-2 rounded-[7px] py-3.5 font-bold text-white transition disabled:cursor-wait disabled:opacity-70 ${colours} ${className}`}>
      {pending ? <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : null}
      {children}
      {!pending && arrow && <ArrowRightIcon className="size-4" />}
    </button>
  );
}

export function FormAlert({ state }: { state?: { error?: string; notice?: string } }) {
  if (state?.error) {
    return <p role="alert" className="flex items-start gap-2 rounded-[7px] bg-danger-soft px-4 py-3 text-sm font-medium text-danger"><AlertIcon className="mt-0.5 size-4 shrink-0" />{state.error}</p>;
  }
  if (state?.notice) {
    return <p role="status" className="flex items-start gap-2 rounded-[7px] bg-success-soft px-4 py-3 text-sm font-medium text-success"><CheckIcon className="mt-0.5 size-4 shrink-0" />{state.notice}</p>;
  }
  return null;
}

/** One field for a numeric code; `one-time-code` lets phones autofill SMS codes. */
export function CodeInput({ name = "code", length = 6, autoFocus = true, label }: { name?: string; length?: number; autoFocus?: boolean; label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <input
        name={name}
        inputMode="numeric"
        autoComplete={length === 6 ? "one-time-code" : "off"}
        pattern={`\\d{${length}}`}
        maxLength={length}
        required
        autoFocus={autoFocus}
        type={length === 4 ? "password" : "text"}
        placeholder={"•".repeat(length)}
        className="w-full rounded-[7px] border border-line bg-white px-4 py-3.5 text-center font-display text-2xl font-bold tracking-[.6em] text-ink outline-none transition placeholder:text-line focus:border-brand focus:ring-4 focus:ring-brand-100"
      />
    </label>
  );
}
