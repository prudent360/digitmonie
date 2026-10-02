"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { FormAlert, SubmitButton } from "@/components/auth/form-bits";
import { LogoMark } from "@/components/logo";

function FileField({ name, label, hint, current, previewBg, square = false, fallback, size }: {
  name: string; label: string; hint: string; current: string | null; previewBg: "light" | "dark"; square?: boolean; fallback: React.ReactNode;
  /** Height slider for logos: [form field name, saved height]. */
  size?: [string, number];
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [remove, setRemove] = useState(false);
  const [height, setHeight] = useState(size?.[1] ?? 36);
  const shown = remove ? null : preview ?? current;
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-ink">{label}</p>
      {/* Preview at the real size, inside a header-height strip like the website's. */}
      <div className={`flex items-center justify-center rounded-[5px] border border-line p-4 ${size ? "h-32" : "h-28"} ${previewBg === "dark" ? "diamond-pattern bg-brand" : "bg-canvas"}`}>
        {shown
          // eslint-disable-next-line @next/next/no-img-element -- local preview of an upload
          ? <img src={shown} alt="" style={size ? { height, maxWidth: Math.min(240, height * 7) } : undefined} className={square ? "size-16 object-contain" : "w-auto object-contain"} />
          : <span className="flex items-center gap-2 text-sm text-muted">{fallback}</span>}
      </div>
      {size && (
        <label className="block">
          <span className="flex items-center justify-between text-xs font-semibold text-body"><span>Size</span><span className="tabular-nums text-ink">{height}px tall</span></span>
          <input type="range" name={size[0]} min={20} max={72} step={1} value={height} onChange={(e) => setHeight(Number(e.target.value))}
            className="range mt-2" style={{ ["--fill" as string]: `${((height - 20) / 52) * 100}%` }} aria-label={`${label} size`} />
          <span className="mt-1 flex justify-between text-[11px] text-muted"><span>Smaller</span><button type="button" onClick={() => setHeight(36)} className="font-semibold text-brand">Reset to 36px</button><span>Larger</span></span>
        </label>
      )}
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

export function BrandingForm({ action, logoUrl, logoDarkUrl, faviconUrl, logoSizeLight, logoSizeDark }: { action: (s: FormState, fd: FormData) => Promise<FormState>; logoUrl: string | null; logoDarkUrl: string | null; faviconUrl: string | null; logoSizeLight: number; logoSizeDark: number }) {
  const [state, formAction] = useActionState(action, undefined);
  const builtIn = (inverted: boolean) => <><LogoMark inverted={inverted} className="size-8" /><span className={`font-display text-lg font-extrabold ${inverted ? "text-white" : "text-brand"}`}>DigitMonie</span></>;
  return (
    <form action={formAction} className="space-y-7">
      <FormAlert state={state} />
      <div className="grid gap-6 md:grid-cols-2">
        <FileField name="logo" label="Logo for light backgrounds" current={logoUrl} previewBg="light" fallback={builtIn(false)} size={["logoSizeLight", logoSizeLight]}
          hint="Blue or dark artwork. Used on the white website header after scrolling, the customer app and sign-in. PNG or WebP with a transparent background, about 360×72 px." />
        <FileField name="logoDark" label="Logo for dark backgrounds" current={logoDarkUrl} previewBg="dark" fallback={builtIn(true)} size={["logoSizeDark", logoSizeDark]}
          hint="White artwork. Used on the blue hero, the footer, the console sidebar and emails. Without it, the light logo is shown on a white tile." />
      </div>
      <div className="max-w-sm">
        <FileField name="favicon" label="Favicon (browser tab icon)" current={faviconUrl} previewBg="light" square fallback={<LogoMark className="size-12" />}
          hint="A square PNG, at least 512×512 px. Shown in browser tabs, bookmarks and phone home screens." />
      </div>
      <p className="text-xs text-muted">Empty borders are trimmed automatically so your logo fills its space, and the size sliders set its height everywhere it appears (width follows its proportions). Sizes apply to uploaded logos; the built-in mark keeps its size. Max 1 MB per image. SVG isn&apos;t accepted; export it as PNG.</p>
      <div className="w-44"><SubmitButton arrow={false}>Save branding</SubmitButton></div>
    </form>
  );
}
