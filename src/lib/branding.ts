import "server-only";
import sharp from "sharp";
import { UploadError } from "./storage";
import { getSettings } from "./settings";

export type Branding = { logoUrl: string | null; logoDarkUrl: string | null; faviconUrl: string | null };

/** Uploaded logos and favicon from Console → Settings → Branding (null = use the built-in mark). */
export async function getBranding(): Promise<Branding> {
  const s = await getSettings("logoUrl", "logoDarkUrl", "faviconUrl").catch(() => ({ logoUrl: "", logoDarkUrl: "", faviconUrl: "" }));
  const v = (x: unknown) => (typeof x === "string" && x ? x : null);
  return { logoUrl: v(s.logoUrl), logoDarkUrl: v(s.logoDarkUrl), faviconUrl: v(s.faviconUrl) };
}

const ACCEPTED = ["image/png", "image/webp", "image/jpeg"];
export const MAX_LOGO_BYTES = 1024 * 1024;

/**
 * Prepares an uploaded image: logos have their empty border trimmed (so they fill the space they're
 * shown in) and are saved as PNG; the favicon becomes a 512×512 PNG. SVG isn't accepted (it can carry scripts).
 */
export async function prepareImage(file: File, kind: "logo" | "favicon"): Promise<Buffer> {
  if (!ACCEPTED.includes(file.type)) throw new UploadError("Upload a PNG, WebP or JPG image.");
  if (file.size > MAX_LOGO_BYTES) throw new UploadError("Images must be 1 MB or smaller.");
  const input = Buffer.from(await file.arrayBuffer());
  try {
    if (kind === "favicon") {
      return await sharp(input).resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    }
    const meta = await sharp(input).metadata();
    if ((meta.width ?? 0) < 40 || (meta.height ?? 0) < 16) throw new UploadError("That image is too small. Use one at least 360 px wide.");
    return await sharp(input).trim({ threshold: 12 }).png().toBuffer();
  } catch (error) {
    if (error instanceof UploadError) throw error;
    throw new UploadError("We couldn't read that image. Try exporting it again as a PNG.");
  }
}
