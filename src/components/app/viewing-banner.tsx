"use client";

import { useSearchParams } from "next/navigation";
import { stopViewingAction } from "@/app/actions/customers";
import { EyeIcon } from "@/components/icons";

/** Pinned to the top of the customer dashboard while a staff member views it read-only. */
export function ViewingBanner({ customer, staff }: { customer: string; staff: string }) {
  const blocked = useSearchParams().get("view-only") === "1";
  return (
    <div className="sticky top-0 z-[60] mb-6 rounded-[7px] bg-ink px-4 py-3 text-white shadow-lg">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[7px] bg-gold text-ink"><EyeIcon className="size-4" /></span>
        <p className="min-w-0 flex-1 text-sm">
          <b>Viewing {customer}&apos;s account, read-only.</b>{" "}
          <span className="text-white/70">You ({staff}) can look around but can&apos;t change anything. This is recorded in the audit log and ends after 30 minutes.</span>
        </p>
        <form action={stopViewingAction}>
          <button className="rounded-[7px] bg-white px-4 py-2 text-sm font-bold text-ink hover:bg-gold">Back to console</button>
        </form>
      </div>
      {blocked && <p role="status" className="mt-2 rounded-[7px] bg-white/10 px-3 py-2 text-sm text-gold">That would change the customer&apos;s account, so it wasn&apos;t done. You&apos;re in read-only view.</p>}
    </div>
  );
}
