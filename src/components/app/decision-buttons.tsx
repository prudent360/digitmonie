"use client";

import { useState } from "react";
import { CheckIcon, LockIcon, XIcon } from "@/components/icons";
import { StatusBadge } from "@/components/ui";

/** Approve / decline with local state. Wire to a server action once the backend exists. */
export function DecisionButtons({ initial, allowed = true, approveLabel = "Approve", declineLabel = "Decline", approvedStatus = "approved", declinedStatus = "declined", lockedReason }: {
  initial: string;
  allowed?: boolean;
  approveLabel?: string;
  declineLabel?: string;
  approvedStatus?: string;
  declinedStatus?: string;
  lockedReason?: string;
}) {
  const [status, setStatus] = useState(initial);

  if (status !== "pending") return <StatusBadge status={status} />;
  if (!allowed) {
    return <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted" title={lockedReason}><LockIcon className="size-3.5" /> {lockedReason ?? "Needs approver"}</span>;
  }
  return (
    <div className="flex gap-1.5">
      <button type="button" onClick={() => setStatus(approvedStatus)} className="inline-flex items-center gap-1 rounded-[7px] bg-success px-2.5 py-1.5 text-xs font-bold text-white transition hover:brightness-110"><CheckIcon className="size-3.5" />{approveLabel}</button>
      <button type="button" onClick={() => setStatus(declinedStatus)} className="inline-flex items-center gap-1 rounded-[7px] bg-danger-soft px-2.5 py-1.5 text-xs font-bold text-danger transition hover:bg-danger hover:text-white"><XIcon className="size-3.5" />{declineLabel}</button>
    </div>
  );
}
