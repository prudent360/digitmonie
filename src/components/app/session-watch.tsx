"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "@/app/actions/auth";
import { stopViewingAction } from "@/app/actions/customers";
import { ClockIcon } from "@/components/icons";

type Timing = { /** Epoch seconds. */ expiresAt: number; hardExpiresAt: number };

/** Warn this long before an idle sign-out, and longer before the hard daily limit. */
const IDLE_WARNING = 60;
const FINAL_WARNING = 5 * 60;
/** Activity extends the session at most this often. */
const EXTEND_EVERY_MS = 60_000;
const ACTIVITY = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

const nowSeconds = () => Date.now() / 1000;

function countdown(seconds: number) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Keeps a signed-in session alive while the user is active, warns before it ends, and sends them
 * to sign in again (back to this page afterwards) when it does. The server enforces the limits;
 * this only keeps the screen honest about them.
 */
export function SessionWatch({ initial, viewing = false }: { initial: Timing; /** A staff member's read-only view of a customer. */ viewing?: boolean }) {
  const pathname = usePathname();
  const [timing, setTiming] = useState(initial);
  const [now, setNow] = useState<number | null>(null);
  const [warning, setWarning] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const warningRef = useRef(false);
  const lastExtend = useRef(0);
  const busy = useRef(false);
  const stayButton = useRef<HTMLButtonElement>(null);

  useEffect(() => { warningRef.current = warning; }, [warning]);

  const leaving = useRef(false);
  const expire = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    if (viewing) {
      // The view has ended; the staff member's own session is still there to go back to.
      void stopViewingAction();
      return;
    }
    const next = `${window.location.pathname}${window.location.search}`;
    // A full page load on purpose: it drops everything the client router has cached for this account.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/login?expired=1&next=${encodeURIComponent(next)}`);
  }, [viewing]);

  const call = useCallback(async (method: "GET" | "POST"): Promise<Timing | null> => {
    try {
      const res = await fetch("/api/session", { method, cache: "no-store" });
      if (res.status === 401) {
        expire();
        return null;
      }
      if (!res.ok) return null;
      const next = (await res.json()) as Timing;
      setTiming(next);
      return next;
    } catch {
      return null; // Offline: keep counting down locally.
    }
  }, [expire]);

  const extend = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    lastExtend.current = Date.now();
    await call("POST");
    busy.current = false;
  }, [call]);

  // Using the app keeps the session alive; once the warning is up, staying needs a deliberate click.
  useEffect(() => {
    const onActivity = () => {
      if (!warningRef.current && Date.now() - lastExtend.current > EXTEND_EVERY_MS) void extend();
    };
    ACTIVITY.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => ACTIVITY.forEach((e) => window.removeEventListener(e, onActivity));
  }, [extend]);

  // Moving to another page counts as activity too.
  useEffect(() => {
    if (!warningRef.current && Date.now() - lastExtend.current > EXTEND_EVERY_MS) void extend();
  }, [pathname, extend]);

  const final = timing.hardExpiresAt - timing.expiresAt < 5;
  const warnAt = final ? FINAL_WARNING : IDLE_WARNING;

  useEffect(() => {
    const id = setInterval(async () => {
      const left = timing.expiresAt - nowSeconds();
      setNow(nowSeconds());
      if (left <= 0) {
        // Another tab may have kept the session going; only leave if it really has ended.
        const latest = await call("GET");
        if (!latest || latest.expiresAt - nowSeconds() <= 0) expire();
        return;
      }
      if (left <= warnAt && !warningRef.current) {
        const latest = await call("GET");
        if (latest && latest.expiresAt - nowSeconds() > warnAt) return;
        setWarning(true);
      } else if (warningRef.current && left > warnAt) {
        setWarning(false);
        setDismissed(false);
      } else if (warningRef.current && Math.round(left) % 10 === 0) {
        void call("GET"); // Pick up activity in other tabs while the warning is showing.
      }
    }, 1000);
    return () => clearInterval(id);
  }, [timing, warnAt, call, expire]);

  // Once a minute, check the session is still valid on the server (it may have been ended elsewhere:
  // "sign out of all devices", a password change, or an admin action).
  useEffect(() => {
    const id = setInterval(() => void call("GET"), 60_000);
    return () => clearInterval(id);
  }, [call]);

  useEffect(() => {
    if (warning && !dismissed) stayButton.current?.focus();
  }, [warning, dismissed]);

  if (!warning || dismissed || now === null) return null;
  const left = countdown(timing.expiresAt - now);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink/50 p-4 backdrop-blur-sm sm:items-center">
      <div role="alertdialog" aria-modal="true" aria-labelledby="session-title" aria-describedby="session-text" className="w-full max-w-sm rounded-[7px] bg-white p-6 shadow-[0_30px_60px_-20px_rgba(6,31,77,.5)]">
        <span className="flex size-11 items-center justify-center rounded-[7px] bg-warning-soft text-warning"><ClockIcon className="size-5" /></span>
        <h2 id="session-title" className="mt-4 font-display text-lg font-bold text-ink">{viewing ? "This view is ending" : final ? "Your session is ending" : "Are you still there?"}</h2>
        <p id="session-text" className="mt-2 text-sm leading-relaxed text-body">
          {viewing
            ? <>Read-only views of a customer&apos;s account last 30 minutes. You&apos;ll go back to the console in <b className="tabular-nums text-ink">{left}</b>.</>
            : final
            ? <>For your security, we sign everyone out at the end of each session. You&apos;ll be signed out in <b className="tabular-nums text-ink">{left}</b>. Save anything you&apos;re working on, then sign in again.</>
            : <>For your security, you&apos;ll be signed out in <b className="tabular-nums text-ink">{left}</b> because you haven&apos;t been active.</>}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {final ? (
            <button ref={stayButton} type="button" onClick={() => setDismissed(true)} className="flex-1 rounded-[7px] bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600">OK</button>
          ) : (
            <button ref={stayButton} type="button" onClick={async () => { await extend(); setWarning(false); }} className="flex-1 rounded-[7px] bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600">Stay signed in</button>
          )}
          <form action={viewing ? stopViewingAction : signOut}>
            <button className="rounded-[7px] border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:border-brand-200">{viewing ? "Back to console" : "Sign out"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
