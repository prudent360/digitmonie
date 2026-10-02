import { cookies } from "next/headers";
import { DEV_OTP_COOKIE } from "@/lib/otp";

/** Local development only: shows the last code sent, since no SMS provider is connected. */
export async function DevCode() {
  if (process.env.NODE_ENV === "production") return null;
  const code = (await cookies()).get(DEV_OTP_COOKIE)?.value;
  if (!code) return null;
  return (
    <p className="mb-5 rounded-[5px] border border-dashed border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning">
      <b>Development:</b> no SMS provider is set, so here&apos;s the code: <span className="font-mono font-bold tracking-widest">{code}</span>
    </p>
  );
}
