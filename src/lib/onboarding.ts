import "server-only";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { loanProducts, loans, roles, users } from "@/db/schema";
import { logAudit } from "./audit";
import { can, fullName, loadUser, type CurrentUser } from "./auth";
import { sendTemplate } from "./email";
import { sendSms, siteUrl, smsConfigured } from "./messaging";
import { ADMIN_ROLE, CUSTOMER_ROLE } from "./permissions";
import { normalizeNgPhone } from "./phone";
import { issueInviteToken } from "./tokens";

// Credit officers (the "customers.onboard" permission) open accounts for customers, verify them and prepare
// loans for them. They only see the customers assigned to them; customer managers can see and reassign anyone.

export type Result = { ok: true; message: string } | { ok: false; error: string };

/** The customer, if this staff member may work on them: their own assigned customer, or anyone for customer managers. */
export async function officerCustomer(staff: CurrentUser, customerId: number): Promise<CurrentUser | null> {
  const customer = await loadUser(customerId);
  if (!customer || customer.role.kind !== "customer") return null;
  if (can(staff, "users.manage")) return customer;
  return can(staff, "customers.onboard") && customer.officerId === staff.id ? customer : null;
}

/** The officer's customers, newest first, with their latest loan. */
export async function myCustomers(staff: CurrentUser) {
  const db = await getDb();
  const rows = await db.select().from(users).where(and(eq(users.roleKey, CUSTOMER_ROLE), eq(users.officerId, staff.id))).orderBy(desc(users.createdAt));
  const ids = rows.map((r) => r.id);
  const latest = new Map<number, { status: string; reference: string; principal: number; product: string }>();
  if (ids.length) {
    const ls = await db.select({ userId: loans.userId, status: loans.status, reference: loans.reference, principal: loans.principal, product: loanProducts.name })
      .from(loans).innerJoin(loanProducts, eq(loanProducts.id, loans.productId)).where(inArray(loans.userId, ids)).orderBy(desc(loans.createdAt));
    for (const l of ls) if (!latest.has(l.userId)) latest.set(l.userId, l);
  }
  return rows.map((u) => ({ user: u, loan: latest.get(u.id) ?? null }));
}

/** Staff who can be assigned customers: active, with the onboarding permission (or administrators). */
export async function creditOfficers() {
  const rows = await (await getDb()).select({ id: users.id, firstName: users.firstName, lastName: users.lastName, roleKey: users.roleKey, permissions: roles.permissions })
    .from(users).innerJoin(roles, eq(roles.key, users.roleKey)).where(and(eq(roles.kind, "staff"), eq(users.status, "active")));
  return rows.filter((r) => r.roleKey === ADMIN_ROLE || r.permissions.includes("customers.onboard")).map((r) => ({ id: r.id, name: fullName(r) }));
}

/** Emails and texts the customer a one-time link to choose their password. Earlier links stop working. */
export async function sendSetupLink(staff: CurrentUser, customer: CurrentUser): Promise<Result> {
  if (customer.status !== "pending") return { ok: false, error: "This customer has already set up their account." };
  const url = `${siteUrl()}/invite/${await issueInviteToken(customer.id)}`;
  const email = await sendTemplate(customer.email, "customer_invite", { name: customer.firstName, officer: fullName(staff), inviteUrl: url });
  let texted = false;
  if (customer.phone) {
    try {
      // Without an SMS provider this only writes to the server log, so it doesn't count as sent.
      await sendSms(customer.phone, `Hi ${customer.firstName}, ${staff.firstName} from DigitMonie opened an account for you. Set your password here (link works once, for 7 days): ${url}`);
      texted = await smsConfigured();
    } catch (error) {
      console.error("[onboarding] set-up SMS failed", error);
    }
  }
  if (!email.sent && !texted) return { ok: false, error: "We couldn't send the set-up link by email or SMS. Check the email and SMS settings (Console → Settings), then resend it." };
  await logAudit({ actorId: staff.id, action: "customer.setup_link_sent", summary: `sent ${fullName(customer)} a link to set up their account`, target: { type: "user", id: customer.id } });
  const where = [email.sent && customer.email, texted && "SMS"].filter(Boolean).join(" and ");
  return { ok: true, message: `Set-up link sent to ${where}.` };
}

export type NewCustomer = { firstName: string; lastName: string; phone: string; email: string; consent: boolean };

/** Opens an account for a customer. It stays "pending" until they choose a password from the link. */
export async function createCustomer(staff: CurrentUser, input: NewCustomer): Promise<{ ok: true; id: number; message: string } | { ok: false; error: string }> {
  if (!can(staff, "customers.onboard")) return { ok: false, error: "You can't add customers." };
  const firstName = input.firstName.trim(), lastName = input.lastName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = normalizeNgPhone(input.phone);
  if (firstName.length < 2 || lastName.length < 2) return { ok: false, error: "Enter their first and last name as they appear on their NIN or BVN." };
  if (!phone) return { ok: false, error: "Enter a Nigerian mobile number, like 0803 123 4567." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (!input.consent) return { ok: false, error: "Confirm the customer has agreed to the Terms and Privacy Policy." };

  const db = await getDb();
  const [taken] = await db.select({ phone: users.phone }).from(users).where(or(eq(users.phone, phone), eq(sql`lower(${users.email})`, email)));
  if (taken) return { ok: false, error: taken.phone === phone ? "That phone number already has an account." : "That email already has an account." };

  const [created] = await db.insert(users).values({
    firstName, lastName, phone, email, roleKey: CUSTOMER_ROLE, status: "pending", invitedById: staff.id, officerId: staff.id,
  }).returning({ id: users.id });
  const customer = (await loadUser(created.id))!;
  await logAudit({ actorId: staff.id, action: "customer.onboarded", summary: `opened an account for ${fullName(customer)} (customer agreed to the Terms and Privacy Policy)`, target: { type: "user", id: customer.id } });
  const sent = await sendSetupLink(staff, customer);
  return { ok: true, id: customer.id, message: sent.ok ? `Account opened. ${sent.message}` : `Account opened, but ${sent.error.charAt(0).toLowerCase()}${sent.error.slice(1)}` };
}

/** Moves a customer to another credit officer (or none). */
export async function assignOfficer(staff: CurrentUser, customerId: number, officerId: number | null): Promise<Result> {
  if (!can(staff, "users.manage")) return { ok: false, error: "You can't reassign customers." };
  const customer = await loadUser(customerId);
  if (!customer || customer.role.kind !== "customer") return { ok: false, error: "Customer not found." };
  const officer = officerId ? (await creditOfficers()).find((o) => o.id === officerId) : null;
  if (officerId && !officer) return { ok: false, error: "Choose an active credit officer." };
  await (await getDb()).update(users).set({ officerId }).where(eq(users.id, customerId));
  await logAudit({ actorId: staff.id, action: "customer.officer_assigned", summary: officer ? `assigned ${fullName(customer)} to ${officer.name}` : `removed ${fullName(customer)}'s credit officer`, target: { type: "user", id: customerId } });
  return { ok: true, message: officer ? `Assigned to ${officer.name}.` : "No credit officer assigned." };
}
