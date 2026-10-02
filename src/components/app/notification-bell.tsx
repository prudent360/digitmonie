"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { bellData, markNotificationsRead, unreadOnly, type BellItem } from "@/app/actions/notifications";
import { BellIcon } from "@/components/icons";

function ago(iso: string) {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

/** Bell with unread count; opens the latest notifications. Checks for new ones every minute. */
export function NotificationBell({ initialUnread, allHref }: { initialUnread: number; allHref: string }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<BellItem[] | null>(null);
  const [, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => start(async () => setUnread(await unreadOnly())), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) start(async () => { const d = await bellData(); setItems(d.items); setUnread(d.unread); });
  }

  function readAll() {
    start(async () => {
      await markNotificationsRead("all");
      setItems((list) => list?.map((i) => ({ ...i, read: true })) ?? null);
      setUnread(0);
    });
  }

  function readOne(item: BellItem) {
    setOpen(false);
    if (!item.read) start(async () => { await markNotificationsRead([item.id]); setUnread((u) => Math.max(0, u - 1)); });
  }

  return (
    <div ref={box} className="relative">
      <button type="button" onClick={toggle} className="relative rounded-[7px] p-2.5 text-body transition hover:bg-canvas" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open}>
        <BellIcon />
        {unread > 0 && <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(92vw,380px)] overflow-hidden rounded-[7px] border border-line bg-white shadow-[0_24px_50px_-20px_rgba(6,31,77,.45)]">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-bold text-ink">Notifications</p>
            {unread > 0 && <button type="button" onClick={readAll} className="text-xs font-semibold text-brand">Mark all as read</button>}
          </div>
          <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
            {items === null && <li className="px-4 py-6 text-center text-sm text-muted">Loading…</li>}
            {items?.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">You&apos;re all caught up.</li>}
            {items?.map((i) => {
              const content = (
                <>
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${i.read ? "bg-transparent" : "bg-brand"}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm ${i.read ? "text-body" : "font-semibold text-ink"}`}>{i.title}</span>
                    {i.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{i.body}</span>}
                    <span className="mt-1 block text-[11px] text-muted">{ago(i.at)}</span>
                  </span>
                </>
              );
              return (
                <li key={i.id}>
                  {i.href ? <Link href={i.href} onClick={() => readOne(i)} className="flex gap-3 px-4 py-3 hover:bg-canvas">{content}</Link> : <button type="button" onClick={() => readOne(i)} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-canvas">{content}</button>}
                </li>
              );
            })}
          </ul>
          <Link href={allHref} onClick={() => setOpen(false)} className="block border-t border-line px-4 py-3 text-center text-sm font-semibold text-brand hover:bg-canvas">See all notifications</Link>
        </div>
      )}
    </div>
  );
}
