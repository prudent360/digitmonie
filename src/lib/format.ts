const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 2 });
const nairaWhole = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 });

export const formatNaira = (value: number) => naira.format(value);
export const formatNairaWhole = (value: number) => nairaWhole.format(value);
export const formatCompactNaira = (value: number) => `₦${compact.format(value)}`;
export const formatNumber = (value: number) => new Intl.NumberFormat("en-NG").format(value);

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Date(iso).toLocaleDateString("en-NG", opts);
}

export function initials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}
