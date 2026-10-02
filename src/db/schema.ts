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

/* ---------- KYC ---------- */

/** Identity details confirmed through KYC (one row per customer). BVN and NIN are encrypted. */
export const kycProfiles = pgTable("kyc_profiles", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  bvnEncrypted: text("bvn_encrypted"),
  /** Keyed hash, so one BVN can't be linked to two accounts without storing it in the clear. */
  bvnHash: text("bvn_hash").unique(),
  bvnLast4: text("bvn_last4"),
  ninEncrypted: text("nin_encrypted"),
  ninHash: text("nin_hash").unique(),
  ninLast4: text("nin_last4"),
  /** Names and birth date as held by NIBSS/NIMC. */
  legalFirstName: text("legal_first_name"),
  legalMiddleName: text("legal_middle_name"),
  legalLastName: text("legal_last_name"),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  addressLine: text("address_line"),
  city: text("city"),
  state: text("state"),
  /** When the customer agreed to identity checks (NDPA consent). */
  consentAt: timestamp("consent_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type KycStatus = "approved" | "pending_review" | "rejected";
export type KycChecks = {
  provider?: string;
  nameScore?: number;
  dobMatch?: boolean;
  faceScore?: number;
  watchlisted?: boolean;
  duplicate?: boolean;
  notes?: string[];
};

/** Each attempt at a tier: approved automatically, waiting for staff, or rejected. */
export const kycSubmissions = pgTable("kyc_submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tier: integer("tier").notNull(),
  status: text("status").$type<KycStatus>().notNull(),
  /** "auto" when the provider checks decided it; "manual" once staff decide. */
  decidedBy: text("decided_by").$type<"auto" | "manual">(),
  checks: jsonb("checks").$type<KycChecks>().notNull().default({}),
  /** Shown to the customer when rejected; for staff when flagged. */
  reason: text("reason"),
  reviewedById: integer("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index("kyc_submissions_status_idx").on(t.status, t.createdAt), index("kyc_submissions_user_idx").on(t.userId)]);

/**
 * Selfies, BVN photos and proof-of-address files. Kept in the database (base64) so they're
 * never publicly reachable; only served through a permission-checked route.
 */
export type KycDocumentKind = "selfie" | "id_photo" | "proof_of_address";
export const kycDocuments = pgTable("kyc_documents", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").notNull().references(() => kycSubmissions.id, { onDelete: "cascade" }),
  kind: text("kind").$type<KycDocumentKind>().notNull(),
  mimeType: text("mime_type").notNull(),
  data: text("data").notNull(),
  size: integer("size").notNull(),
  createdAt: createdAt(),
}, (t) => [index("kyc_documents_submission_idx").on(t.submissionId)]);

export type KycProfile = typeof kycProfiles.$inferSelect;
export type KycSubmission = typeof kycSubmissions.$inferSelect;
