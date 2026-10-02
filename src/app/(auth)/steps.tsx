/** Progress bar for the 3-step customer sign-up. */
export function Steps({ current }: { current: number }) {
  return (
    <>
      <p className="text-sm font-bold text-brand">Step {current} of 3</p>
      <div className="mt-2 flex gap-1.5">{[1, 2, 3].map((s) => <span key={s} className={`h-1.5 flex-1 rounded-[7px] ${s <= current ? "bg-brand" : "bg-line"}`} />)}</div>
    </>
  );
}
