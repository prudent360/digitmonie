import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/** Local-only upload folder, served by app/uploads/[...path]/route.ts. Production uses Vercel Blob. */
export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");

export class UploadError extends Error {}

/** True when a Vercel Blob store is connected to the project. */
export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export function isEmptyFile(value: FormDataEntryValue | null): value is null {
  return !value || typeof value === "string" || value.size === 0;
}

/** Stores a public file (branding only; never identity documents) and returns its URL. */
export async function savePublicFile(data: Buffer, folder: "branding", ext: string, contentType: string): Promise<string> {
  const name = `${folder}/${randomUUID()}.${ext}`;
  if (blobConfigured()) {
    const { put } = await import("@vercel/blob");
    try {
      return (await put(name, data, { access: "public", contentType })).url;
    } catch (error) {
      throw new UploadError(`Vercel Blob rejected the upload: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (process.env.VERCEL) throw new UploadError("Uploads need a Vercel Blob store. Connect one in the Vercel dashboard.");
  const target = path.join(LOCAL_UPLOAD_DIR, name);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
  return `/uploads/${name}`;
}

/** Deletes a file saved by savePublicFile. Best effort: never blocks saving settings. */
export async function deletePublicFile(url: string | null | undefined): Promise<void> {
  if (!url) return;
  try {
    if (url.startsWith("/uploads/")) {
      const target = path.resolve(LOCAL_UPLOAD_DIR, url.slice("/uploads/".length));
      if (target.startsWith(LOCAL_UPLOAD_DIR + path.sep)) await unlink(target);
    } else if (blobConfigured() && new URL(url).hostname.endsWith(".blob.vercel-storage.com")) {
      const { del } = await import("@vercel/blob");
      await del(url);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("[storage] could not delete", url, error);
  }
}
