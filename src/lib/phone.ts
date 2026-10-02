/** Normalises a Nigerian mobile number to 234XXXXXXXXXX, or returns null if it isn't one. */
export function normalizeNgPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  let local: string;
  if (digits.startsWith("234") && digits.length === 13) local = digits.slice(3);
  else if (digits.startsWith("0") && digits.length === 11) local = digits.slice(1);
  else if (digits.length === 10) local = digits;
  else return null;
  return /^[789][01]\d{8}$/.test(local) ? `234${local}` : null;
}

/** 2348031234567 → 0803 123 4567 */
export function formatNgPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const local = `0${phone.slice(3)}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

/** 2348031234567 → 0803 *** 4567 */
export function maskNgPhone(phone: string | null | undefined): string {
  const f = formatNgPhone(phone);
  return f ? `${f.slice(0, 4)} *** ${f.slice(-4)}` : "";
}
