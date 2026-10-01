"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isRole } from "@/lib/roles";
import { SESSION_COOKIE } from "@/lib/session";

/** DEMO ONLY: signs in as the chosen role so each experience can be previewed. */
export async function demoSignIn(formData: FormData) {
  const role = formData.get("role");
  if (!isRole(role)) redirect("/login");
  (await cookies()).set(SESSION_COOKIE, role, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  redirect(role === "customer" ? "/dashboard" : "/console");
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
