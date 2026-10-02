import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import type { Permission } from "@/lib/permissions";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/** Customers use the app; staff use the console. A role belongs to exactly one kind. */
export type UserKind = "customer" | "staff";
/** "pending" is an invited staff member who hasn't set a password yet. */
export type UserStatus = "pending" | "active" | "restricted" | "frozen" | "closed";

export const roles = pgTable("roles", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  kind: text("kind").$type<UserKind>().notNull(),
  permissions: jsonb("permissions").$type<Permission[]>().notNull().default([]),
  /** Built-in roles can't be deleted; the admin role's permissions can't be edited. */
  system: boolean("system").notNull().default(false),
  createdAt: createdAt(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  /** Lower-cased. */
  email: text("email").notNull().unique(),
  /** Nigerian numbers in international form without "+", e.g. 2348031234567. */
  phone: text("phone").unique(),
  passwordHash: text("password_hash"),
  /** 4-digit transaction PIN (customers). */
  pinHash: text("pin_hash"),
  pinAttempts: integer("pin_attempts").notNull().default(0),
  pinLockedUntil: timestamp("pin_locked_until", { withTimezone: true }),
  roleKey: text("role_key").notNull().references(() => roles.key),
  status: text("status").$type<UserStatus>().notNull().default("active"),
  kycTier: integer("kyc_tier").notNull().default(0),
  phoneVerifiedAt: timestamp("phone_verified_at", { withTimezone: true }),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  /** Authenticator-app secret, encrypted (staff). */
  totpSecret: text("totp_secret"),
  totpEnabledAt: timestamp("totp_enabled_at", { withTimezone: true }),
  /** Bumped to sign the user out everywhere (password reset, deactivation, role change). */
  sessionVersion: integer("session_version").notNull().default(1),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  invitedById: integer("invited_by_id"),
  createdAt: createdAt(),
}, (t) => [index("users_role_idx").on(t.roleKey)]);

/** Short numeric codes sent by SMS or email. Only the hash is stored. */
export type OtpPurpose = "verify_phone" | "reset_password";
export const otpCodes = pgTable("otp_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purpose: text("purpose").$type<OtpPurpose>().notNull(),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index("otp_codes_user_idx").on(t.userId, t.purpose)]);

/** One-time links (staff invitations). Only the hash is stored. */
export const authTokens = pgTable("auth_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purpose: text("purpose").$type<"invite">().notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/** Failed sign-in, code and PIN attempts, for rate limiting. */
export const loginAttempts = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  key: text("key").notNull(),
  createdAt: createdAt(),
}, (t) => [index("login_attempts_key_idx").on(t.key, t.createdAt)]);

/** Who did what. Written for every staff action and every security change on an account. */
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  summary: text("summary").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>(),
  ip: text("ip"),
  createdAt: createdAt(),
}, (t) => [index("audit_logs_created_idx").on(t.createdAt)]);

export type Role = typeof roles.$inferSelect;
export type User = typeof users.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
