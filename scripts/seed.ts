import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { closeDb, createDb, runMigrations } from "../src/db/client";
import { roles, users } from "../src/db/schema";
import { ADMIN_ROLE, CUSTOMER_ROLE, DEFAULT_STAFF_ROLE, PERMISSIONS } from "../src/lib/permissions";

/**
 * Creates the built-in roles and the first administrator. Safe to run repeatedly: it never
 * overwrites roles or accounts that already exist (except keeping the admin role complete).
 * In local development it also creates demo accounts so every area can be tried.
 */
async function main() {
  const db = await createDb();
  await runMigrations(db);

  await db.insert(roles).values([
    { key: CUSTOMER_ROLE, name: "Customer", description: "Uses the DigitMonie app.", kind: "customer", permissions: [], system: true },
    { key: ADMIN_ROLE, name: "Administrator", description: "Full access, including team, roles and settings.", kind: "staff", permissions: [...PERMISSIONS], system: true },
    { key: DEFAULT_STAFF_ROLE, name: "Staff", description: "Day-to-day operations: customers, KYC and loan reviews.", kind: "staff", permissions: ["console.access", "users.view", "kyc.review", "loans.review", "transactions.view"], system: true },
  ]).onConflictDoNothing();
  await db.update(roles).set({ permissions: [...PERMISSIONS] }).where(eq(roles.key, ADMIN_ROLE));

  const created: string[] = [];
  async function ensureUser(values: typeof users.$inferInsert & { password: string; pin?: string }, label: string) {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, values.email));
    if (existing) return;
    const { password, pin, ...rest } = values;
    await db.insert(users).values({ ...rest, passwordHash: await bcrypt.hash(password, 12), pinHash: pin ? await bcrypt.hash(pin, 12) : null });
    created.push(`${label}: ${values.email}${values.phone ? ` / 0${values.phone.slice(3)}` : ""} · password ${password}${pin ? ` · PIN ${pin}` : ""}`);
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail && process.env.ADMIN_PASSWORD) {
    const [first, ...rest] = (process.env.ADMIN_NAME || "DigitMonie Admin").split(" ");
    await ensureUser({ firstName: first, lastName: rest.join(" ") || "Admin", email: adminEmail, password: process.env.ADMIN_PASSWORD, roleKey: ADMIN_ROLE, emailVerifiedAt: new Date() }, "Admin");
  }

  if (process.env.NODE_ENV !== "production" && !process.env.DATABASE_URL) {
    const now = new Date();
    if (!adminEmail) await ensureUser({ firstName: "Ifiok", lastName: "Udo", email: "admin@digitmonie.local", password: "AdminPass123!", roleKey: ADMIN_ROLE, emailVerifiedAt: now }, "Demo admin");
    await ensureUser({ firstName: "Tunde", lastName: "Bakare", email: "staff@digitmonie.local", password: "StaffPass123!", roleKey: DEFAULT_STAFF_ROLE, emailVerifiedAt: now }, "Demo staff");
    await ensureUser({ firstName: "Adaeze", lastName: "Okafor", email: "customer@digitmonie.local", phone: "2348030000001", password: "CustomerPass123!", pin: "2580", roleKey: CUSTOMER_ROLE, phoneVerifiedAt: now, kycTier: 2 }, "Demo customer");
  }

  await closeDb(db);
  console.log("Seed complete.");
  if (created.length) console.log(`Created:\n  ${created.join("\n  ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
