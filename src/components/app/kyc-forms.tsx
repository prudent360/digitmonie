"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { FormAlert, SubmitButton } from "@/components/auth/form-bits";
import { Field, inputClass } from "@/components/form";
import { CheckIcon, IdCardIcon } from "@/components/icons";

type Action = (state: FormState, fd: FormData) => Promise<FormState>;

const MAX_SIDE = 720;

/** Draws a source (video frame or image) onto a canvas no larger than 720px and returns a JPEG data URL. */
function toJpeg(source: CanvasImageSource, width: number, height: number, mirror = false): string {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d")!;
  if (mirror) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function BvnForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, undefined);
  const f = state?.fields ?? {};
  return (
    <form action={formAction} className="space-y-5">
      <FormAlert state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="BVN" hint={<span className="text-xs font-normal text-muted">Dial *565*0#</span>}>
          <input className={`${inputClass} font-mono tracking-widest`} name="bvn" defaultValue={f.bvn} inputMode="numeric" maxLength={11} pattern="\d{11}" placeholder="22222222222" required />
        </Field>
        <Field label="Date of birth"><input className={inputClass} type="date" name="dateOfBirth" defaultValue={f.dateOfBirth} max={new Date().toISOString().slice(0, 10)} required /></Field>
      </div>
      <Consent />
      <SubmitButton>Verify BVN</SubmitButton>
    </form>
  );
}

function Consent() {
  return (
    <label className="flex items-start gap-3 rounded-[5px] bg-canvas p-4 text-sm text-body">
      <input type="checkbox" name="consent" required className="mt-0.5 size-4 shrink-0 accent-brand" />
      <span>I agree that DigitMonie may check my details with NIBSS and NIMC through its verification partner to confirm my identity, as described in the <a href="#" className="font-semibold text-brand">Privacy Policy</a>. My BVN doesn&apos;t give DigitMonie access to my bank accounts.</span>
    </label>
  );
}

/** Front camera with a face guide; falls back to choosing or taking a photo with the phone camera app. */
function SelfieCapture({ value, onChange }: { value: string; onChange: (dataUrl: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<"idle" | "camera" | "error">("idle");

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  useEffect(() => stop, []);

  async function start() {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 960 } }, audio: false });
      setMode("camera");
      requestAnimationFrame(() => {
        if (video.current) {
          video.current.srcObject = stream.current;
          void video.current.play();
        }
      });
    } catch {
      setMode("error");
    }
  }

  function snap() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    onChange(toJpeg(v, v.videoWidth, v.videoHeight, true));
    stop();
    setMode("idle");
  }

  function fromFile(file: File | undefined) {
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      onChange(toJpeg(img, img.naturalWidth, img.naturalHeight));
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-ink">Selfie</p>
      <div className="relative mx-auto flex aspect-[3/4] w-full max-w-[280px] items-center justify-center overflow-hidden rounded-[5px] bg-brand-950">
        {mode === "camera" ? (
          <>
            <video ref={video} playsInline muted className="size-full -scale-x-100 object-cover" />
            {/* Face guide */}
            <span className="pointer-events-none absolute inset-x-[18%] top-[14%] bottom-[22%] rounded-[50%] border-2 border-dashed border-gold" />
          </>
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of the captured data URL
          <img src={value} alt="Your selfie" className="size-full object-cover" />
        ) : (
          <div className="px-6 text-center text-sm text-white/70">
            <IdCardIcon className="mx-auto mb-3 size-8 text-gold" />
            Face the camera in good light. Remove glasses and hats.
          </div>
        )}
        {value && mode !== "camera" && <span className="absolute right-2 top-2 flex items-center gap-1 rounded-[5px] bg-success px-2 py-1 text-xs font-bold text-white"><CheckIcon className="size-3" /> Ready</span>}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {mode === "camera" ? (
          <button type="button" onClick={snap} className="rounded-[5px] bg-brand px-5 py-2.5 text-sm font-bold text-white">Take photo</button>
        ) : (
          <button type="button" onClick={start} className="rounded-[5px] bg-brand px-5 py-2.5 text-sm font-bold text-white">{value ? "Retake" : "Open camera"}</button>
        )}
        <label className="cursor-pointer rounded-[5px] border border-line bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:border-brand-200">
          Upload a photo
          <input type="file" accept="image/jpeg,image/png" capture="user" className="sr-only" onChange={(e) => fromFile(e.target.files?.[0])} />
        </label>
      </div>
      {mode === "error" && <p className="mt-2 text-center text-xs text-danger">We couldn&apos;t open your camera. Allow camera access, or upload a photo instead.</p>}
    </div>
  );
}

export function NinSelfieForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, undefined);
  const [selfie, setSelfie] = useState("");
  return (
    <form action={formAction} className="space-y-5">
      <FormAlert state={state} />
      <Field label="NIN" hint={<span className="text-xs font-normal text-muted">Dial *346#</span>}>
        <input className={`${inputClass} font-mono tracking-widest`} name="nin" defaultValue={state?.fields?.nin} inputMode="numeric" maxLength={11} pattern="\d{11}" placeholder="12345678901" required />
      </Field>
      <SelfieCapture value={selfie} onChange={setSelfie} />
      <input type="hidden" name="selfie" value={selfie} />
      {selfie ? <SubmitButton>Verify NIN and selfie</SubmitButton> : <p className="rounded-[5px] bg-canvas py-3.5 text-center text-sm font-semibold text-muted">Take your selfie to continue</p>}
    </form>
  );
}

export function AddressForm({ action, states }: { action: Action; states: string[] }) {
  const [state, formAction] = useActionState(action, undefined);
  const f = state?.fields ?? {};
  return (
    <form action={formAction} className="space-y-5">
      <FormAlert state={state} />
      <Field label="Street address"><input className={inputClass} name="addressLine" defaultValue={f.addressLine} placeholder="12 Admiralty Way, Lekki Phase 1" required /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City or town"><input className={inputClass} name="city" defaultValue={f.city} required /></Field>
        <Field label="State">
          <select className={inputClass} name="state" defaultValue={f.state ?? ""} required>
            <option value="" disabled>Choose state</option>
            {states.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Proof of address" hint={<span className="text-xs font-normal text-muted">JPG, PNG or PDF · max 3 MB</span>}>
        <input type="file" name="document" accept="image/jpeg,image/png,application/pdf" required className="block w-full rounded-[5px] border border-dashed border-line bg-canvas p-4 text-sm text-body file:mr-4 file:rounded-[5px] file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-bold file:text-white" />
      </Field>
      <p className="text-xs text-muted">A utility bill (electricity, water, waste) or bank statement from the last 3 months, showing your name and this address.</p>
      <SubmitButton>Submit for review</SubmitButton>
    </form>
  );
}
