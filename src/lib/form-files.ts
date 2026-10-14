import "server-only";

// Files posted with forms. Kept small and typed, then stored as base64 (see db/schema.ts).

export type Upload = { fileName: string; mimeType: string; data: string; size: number };

const MAX = 3 * 1024 * 1024;

/** A bank statement for a loan application: PDF, JPG or PNG up to 3 MB. null when none was chosen. */
export async function statementFrom(file: FormDataEntryValue | null): Promise<Upload | null | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) return { error: "Upload the statement as a PDF, JPG or PNG." };
  if (file.size > MAX) return { error: "That statement is too large (max 3 MB)." };
  return { fileName: file.name.slice(0, 120), mimeType: file.type, data: Buffer.from(await file.arrayBuffer()).toString("base64"), size: file.size };
}

/** A proof of address as a data URL, ready for submitAddress. */
export async function addressDocumentFrom(file: FormDataEntryValue | null): Promise<string | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: "Upload a utility bill or bank statement." };
  if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) return { error: "Upload a JPG, PNG or PDF." };
  if (file.size > MAX) return { error: "That file is too large (max 3 MB)." };
  return `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
}
