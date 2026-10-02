export const inputClass =
  "w-full rounded-[7px] border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-brand-100";

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-sm font-semibold text-ink">{label}{hint}</span>
      {children}
    </label>
  );
}
