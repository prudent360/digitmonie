"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { FormAlert } from "@/components/auth/form-bits";
import { inputClass } from "@/components/form";
import { CheckIcon, XIcon } from "@/components/icons";

export function KycDecision({ action }: { action: (state: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [rejecting, setRejecting] = useState(false);
  if (state?.notice) return <FormAlert state={state} />;
  return (
    <form action={formAction} className="space-y-3">
      <FormAlert state={state} />
      {rejecting && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink">Reason (the customer will see this)</span>
          <textarea name="reason" rows={3} required minLength={5} className={inputClass} placeholder="e.g. The utility bill is older than 3 months. Please upload a recent one." />
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {!rejecting && (
          <button name="decision" value="approve" disabled={pending} className="inline-flex items-center gap-2 rounded-[5px] bg-success px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 disabled:opacity-60"><CheckIcon className="size-4" /> Approve</button>
        )}
        {rejecting ? (
          <>
            <button name="decision" value="reject" disabled={pending} className="inline-flex items-center gap-2 rounded-[5px] bg-danger px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"><XIcon className="size-4" /> Confirm rejection</button>
            <button type="button" onClick={() => setRejecting(false)} className="rounded-[5px] px-4 py-2.5 text-sm font-semibold text-body">Cancel</button>
          </>
        ) : (
          <button type="button" onClick={() => setRejecting(true)} className="inline-flex items-center gap-2 rounded-[5px] bg-danger-soft px-5 py-2.5 text-sm font-bold text-danger hover:bg-danger hover:text-white"><XIcon className="size-4" /> Reject</button>
        )}
      </div>
    </form>
  );
}
