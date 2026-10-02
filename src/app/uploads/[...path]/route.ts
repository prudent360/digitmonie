import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOCAL_UPLOAD_DIR } from "@/lib/storage";

const TYPES: Record<string, string> = { png: "image/png", webp: "image/webp", jpg: "image/jpeg" };

/** Serves branding files saved by the local upload fallback (development). Production uses Vercel Blob. */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const file = path.resolve(LOCAL_UPLOAD_DIR, ...(await params).path);
  const type = TYPES[path.extname(file).slice(1).toLowerCase()];
  if (!type || !file.startsWith(path.join(LOCAL_UPLOAD_DIR, "branding") + path.sep)) return new Response("Not found", { status: 404 });
  try {
    return new Response(await readFile(file), { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
