"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { FormAlert, SubmitButton } from "@/components/auth/form-bits";
import { LogoMark } from "@/components/logo";

function FileField({ name, label, hint, current, previewBg, square = false, fallback }: {
  name: string; label: string; hint: string; current: string | null; previewBg: "light" | "dark"; square?: boolean; fallback: React.ReactNode;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const shown = remove ? null : preview ?? current;
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-ink">{label}</p>
      <div className={`flex h-28 items-center justify-center rounded-[5px] border border-line p-4 ${previewBg === "dark" ? "diamond-pattern bg-brand" : "bg-canvas"}`}>
        {shown
          // eslint-disable-next-line @next/next/no-img-element -- local preview of an upload
          ? <img src={shown} alt="" className={square ? "size-16 object-contain" : "h-12 w-auto max-w-full object-contain"} />
          : <span className="flex items-center gap-2 text-sm text-muted">{fallback}</span>}
      </div>
      <input type="file" name={name} accept="image/png,image/webp,image/jpeg"
        onChange={(e) => { const f = e.target.files?.[0]; setPreview(f ? URL.createObjectURL(f) : null); setRemove(false); }}
        className="block w-full rounded-[5px] border border-dashed border-line bg-white p-3 text-sm file:mr-3 file:rounded-[5px] file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-white" />
      <p className="text-xs text-muted">{hint}</p>
      {current && (
        <label className="flex items-center gap-2 text-xs font-semibold text-danger">
          <input type="checkbox" name={`remove_${name}`} checked={remove} onChange={(e) => setRemove(e.target.checked)} className="accent-danger" /> Remove and use the built-in mark
        </label>
      )}
    </div>
  );
}

export function BrandingForm({ action, logoUrl, logoDarkUrl, faviconUrl }: { action: (s: FormState, fd: FormData) => Promise<FormState>; logoUrl: string | null; logoDarkUrl: string | null; faviconUrl: string | null }) {
  const [state, formAction] = useActionState(action, undefined);
  const builtIn = (inverted: boolean) => <><LogoMark inverted={inverted} className="size-8" /><span className={`font-display text-lg font-extrabold ${inverted ? "text-white" : "text-brand"}`}>DigitMonie</span></>;
  return (
    <form action={formAction} className="space-y-7">
      <FormAlert state={state} />
      <div className="grid gap-6 md:grid-cols-2">
        <FileField name="logo" label="Logo for light backgrounds" current={logoUrl} previewBg="light" fallback={builtIn(false)}
          hint="Blue or dark artwork. Used on the white website header after scrolling, the customer app and sign-in. PNG or WebP with a transparent background, about 360×72 px." />
        <FileField name="logoDark" label="Logo for dark backgrounds" current={logoDarkUrl} previewBg="dark" fallback={builtIn(true)}
          hint="White artwork. Used on the blue hero, the footer, the console sidebar and emails. Without it, the light logo is shown on a white tile." />
      </div>
      <div className="max-w-sm">
        <FileField name="favicon" label="Favicon (browser tab icon)" current={faviconUrl} previewBg="light" square fallback={<LogoMark className="size-12" />}
          hint="A square PNG, at least 512×512 px. Shown in browser tabs, bookmarks and phone home screens." />
      </div>
      <p className="text-xs text-muted">Empty borders are trimmed automatically so your logo fills its space. Max 1 MB per image. SVG isn&apos;t accepted; export it as PNG.</p>
      <div className="w-44"><SubmitButton arrow={false}>Save branding</SubmitButton></div>
    </form>
  );
}
