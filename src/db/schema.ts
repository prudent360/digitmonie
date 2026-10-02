import { bigint, boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
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
  /** Why staff restricted, froze or closed the account (shown in the console). */
  statusReason: text("status_reason"),
  statusChangedAt: timestamp("status_changed_at", { withTimezone: true }),
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

/* ---------- Lending ---------- */

/** Money is stored in kobo (₦1 = 100 kobo) as whole numbers. */
const kobo = (name: string) => bigint(name, { mode: "number" });

export const loanProducts = pgTable("loan_products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  minAmount: kobo("min_amount").notNull(),
  maxAmount: kobo("max_amount").notNull(),
  /** Allowed repayment periods in months, e.g. [1, 2, 3]. */
  tenors: jsonb("tenors").$type<number[]>().notNull(),
  /** Monthly interest in basis points (350 = 3.5% a month). */
  monthlyRateBps: integer("monthly_rate_bps").notNull(),
  interestMethod: text("interest_method").$type<"reducing" | "flat">().notNull().default("reducing"),
  /** One-off processing fee in basis points of the amount, deducted before payout. */
  processingFeeBps: integer("processing_fee_bps").notNull().default(0),
  /** One-off late fee in basis points of an overdue instalment. */
  lateFeeBps: integer("late_fee_bps").notNull().default(0),
  minKycTier: integer("min_kyc_tier").notNull().default(1),
  /** Ask for a bank statement when the amount is above this (null = never). */
  statementAbove: kobo("statement_above"),
  /** Approve without staff when the score is strong and the amount is at or below this (null = never). */
  autoApproveUpTo: kobo("auto_approve_up_to"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

/** What we know about a customer's ability to repay, and their limit. */
export const creditProfiles = pgTable("credit_profiles", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  monthlyIncome: kobo("monthly_income"),
  employmentType: text("employment_type"),
  employer: text("employer"),
  /** Set by staff to override the calculated limit. */
  limitOverride: kobo("limit_override"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LoanStatus =
  | "pending" // submitted, waiting for a reviewer
  | "reviewed" // a reviewer recommended approval; waiting for a second person
  | "approved" // approved, waiting for payout
  | "active" // paid out, being repaid
  | "repaid"
  | "defaulted"
  | "written_off"
  | "declined"
  | "cancelled";

export type ScoreDetails = { score: number; band: "A" | "B" | "C" | "D"; recommendation: "approve" | "review" | "decline"; reasons: { label: string; points: number }[]; hardStops: string[] };
export type BureauSummary = { provider: string; checkedAt: string; score: number | null; openLoans: number; outstanding: number; delinquent: boolean; worstStatus: string; lenders: number };

export const loans = pgTable("loans", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  productId: integer("product_id").notNull().references(() => loanProducts.id),
  status: text("status").$type<LoanStatus>().notNull(),
  // Terms, frozen at application time
  principal: kobo("principal").notNull(),
  tenorMonths: integer("tenor_months").notNull(),
  monthlyRateBps: integer("monthly_rate_bps").notNull(),
  interestMethod: text("interest_method").$type<"reducing" | "flat">().notNull(),
  processingFee: kobo("processing_fee").notNull(),
  lateFeeBps: integer("late_fee_bps").notNull(),
  totalInterest: kobo("total_interest").notNull(),
  totalRepayable: kobo("total_repayable").notNull(),
  instalment: kobo("instalment").notNull(),
  aprBps: integer("apr_bps").notNull(),
  purpose: text("purpose").notNull(),
  // Where the money goes
  payoutBank: text("payout_bank").notNull(),
  /** NIP / Flutterwave bank code, needed for automatic payouts. */
  payoutBankCode: text("payout_bank_code"),
  payoutAccount: text("payout_account").notNull(),
  payoutName: text("payout_name").notNull(),
  // Assessment
  declaredIncome: kobo("declared_income"),
  score: jsonb("score").$type<ScoreDetails>(),
  bureau: jsonb("bureau").$type<BureauSummary>(),
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }).notNull(),
  // Decisions (four-eyes: the approver must not be the reviewer)
  reviewedById: integer("reviewed_by_id").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNote: text("review_note"),
  approvedById: integer("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  autoApproved: boolean("auto_approved").notNull().default(false),
  declinedById: integer("declined_by_id").references(() => users.id, { onDelete: "set null" }),
  declineReason: text("decline_reason"),
  disbursedById: integer("disbursed_by_id").references(() => users.id, { onDelete: "set null" }),
  disbursedAt: timestamp("disbursed_at", { withTimezone: true }),
  disbursementReference: text("disbursement_reference"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  /** Staff member chasing this loan when it's overdue. */
  collectorId: integer("collector_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
}, (t) => [index("loans_user_idx").on(t.userId), index("loans_status_idx").on(t.status, t.createdAt)]);

export type InstalmentStatus = "upcoming" | "due" | "overdue" | "paid";
export const loanInstalments = pgTable("loan_instalments", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").notNull().references(() => loans.id, { onDelete: "cascade" }),
  n: integer("n").notNull(),
  /** YYYY-MM-DD */
  dueDate: text("due_date").notNull(),
  principal: kobo("principal").notNull(),
  interest: kobo("interest").notNull(),
  lateFee: kobo("late_fee").notNull().default(0),
  paid: kobo("paid").notNull().default(0),
  /** How `paid` splits across late fee, interest and principal (filled in that order), for the ledger. */
  paidLateFee: kobo("paid_late_fee").notNull().default(0),
  paidInterest: kobo("paid_interest").notNull().default(0),
  paidPrincipal: kobo("paid_principal").notNull().default(0),
  status: text("status").$type<InstalmentStatus>().notNull().default("upcoming"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
}, (t) => [uniqueIndex("loan_instalments_loan_n_idx").on(t.loanId, t.n), index("loan_instalments_due_idx").on(t.status, t.dueDate)]);

export type PaymentStatus = "pending" | "success" | "failed";
export const loanPayments = pgTable("loan_payments", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").notNull().references(() => loans.id, { onDelete: "cascade" }),
  amount: kobo("amount").notNull(),
  method: text("method").$type<"flutterwave" | "paystack" | "manual" | "test">().notNull(),
  reference: text("reference").notNull().unique(),
  status: text("status").$type<PaymentStatus>().notNull().default("pending"),
  note: text("note"),
  recordedById: integer("recorded_by_id").references(() => users.id, { onDelete: "set null" }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index("loan_payments_loan_idx").on(t.loanId)]);

/** Bank statements uploaded with an application. Private; served only to loan reviewers. */
export const loanDocuments = pgTable("loan_documents", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").notNull().references(() => loans.id, { onDelete: "cascade" }),
  kind: text("kind").$type<"bank_statement">().notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  data: text("data").notNull(),
  size: integer("size").notNull(),
  createdAt: createdAt(),
});

export type LoanProduct = typeof loanProducts.$inferSelect;
export type Loan = typeof loans.$inferSelect;
export type LoanInstalment = typeof loanInstalments.$inferSelect;
export type LoanPayment = typeof loanPayments.$inferSelect;

/* ---------- Platform settings ---------- */

/** One row per setting. Secret values are encrypted (see lib/settings). */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<string | number | boolean>().notNull(),
  updatedById: integer("updated_by_id").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------- Payouts ---------- */

export type PayoutStatus = "processing" | "successful" | "failed";

/** Every attempt to send a loan to the customer's bank account, automatic (Flutterwave) or manual. */
export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").notNull().references(() => loans.id, { onDelete: "restrict" }),
  method: text("method").$type<"flutterwave" | "manual" | "test">().notNull(),
  amount: kobo("amount").notNull(),
  bankName: text("bank_name").notNull(),
  bankCode: text("bank_code"),
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name").notNull(),
  /** Our reference; for manual payouts, the bank transfer reference. */
  reference: text("reference").notNull().unique(),
  providerId: text("provider_id"),
  status: text("status").$type<PayoutStatus>().notNull(),
  failureReason: text("failure_reason"),
  /** Provider's transfer fee, posted to the ledger as an expense. */
  fee: kobo("fee").notNull().default(0),
  initiatedById: integer("initiated_by_id").references(() => users.id, { onDelete: "set null" }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index("payouts_loan_idx").on(t.loanId), index("payouts_status_idx").on(t.status, t.createdAt)]);

/* ---------- Ledger (double entry) ---------- */

export type LedgerAccountType = "asset" | "liability" | "equity" | "income" | "expense";
export const ledgerAccounts = pgTable("ledger_accounts", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  type: text("type").$type<LedgerAccountType>().notNull(),
});

/** One business event (a payout, a repayment). Its lines always balance: total debits = total credits. */
export const ledgerEntries = pgTable("ledger_entries", {
  id: serial("id").primaryKey(),
  /** Idempotency: the same event can't be posted twice. */
  reference: text("reference").notNull().unique(),
  description: text("description").notNull(),
  loanId: integer("loan_id").references(() => loans.id, { onDelete: "restrict" }),
  createdById: integer("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export const ledgerLines = pgTable("ledger_lines", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull().references(() => ledgerEntries.id, { onDelete: "restrict" }),
  accountCode: text("account_code").notNull().references(() => ledgerAccounts.code),
  debit: kobo("debit").notNull().default(0),
  credit: kobo("credit").notNull().default(0),
}, (t) => [index("ledger_lines_account_idx").on(t.accountCode), index("ledger_lines_entry_idx").on(t.entryId)]);

export type Payout = typeof payouts.$inferSelect;

/* ---------- Notifications ---------- */

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  href: text("href"),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)]);

/* ---------- Customer contact log and collections ---------- */

export type ContactChannel = "call" | "sms" | "email" | "whatsapp" | "visit" | "note";
export type ContactOutcome = "reached" | "no_answer" | "promised" | "disputed" | "wrong_number" | "other";

/** Every conversation or note about a customer, newest first on their profile. */
export const customerContacts = pgTable("customer_contacts", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  loanId: integer("loan_id").references(() => loans.id, { onDelete: "set null" }),
  authorId: integer("author_id").references(() => users.id, { onDelete: "set null" }),
  channel: text("channel").$type<ContactChannel>().notNull(),
  outcome: text("outcome").$type<ContactOutcome>(),
  note: text("note").notNull(),
  createdAt: createdAt(),
}, (t) => [index("customer_contacts_customer_idx").on(t.customerId, t.createdAt)]);

export type PromiseStatus = "open" | "kept" | "broken" | "cancelled";
export const paymentPromises = pgTable("payment_promises", {
  id: serial("id").primaryKey(),
  loanId: integer("loan_id").notNull().references(() => loans.id, { onDelete: "cascade" }),
  amount: kobo("amount").notNull(),
  /** YYYY-MM-DD */
  dueDate: text("due_date").notNull(),
  status: text("status").$type<PromiseStatus>().notNull().default("open"),
  createdById: integer("created_by_id").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [index("payment_promises_loan_idx").on(t.loanId)]);

/* ---------- Reconciliation ---------- */

export type ReconStatus = "matched" | "issues" | "skipped" | "failed";
export type ReconSummary = { payoutsTheirs: number; payoutsOurs: number; collectionsTheirs: number; collectionsOurs: number; issues: number; note?: string };

/** One run per calendar day (Lagos time): Flutterwave's records against ours. */
export const reconciliationRuns = pgTable("reconciliation_runs", {
  id: serial("id").primaryKey(),
  /** YYYY-MM-DD */
  date: text("date").notNull().unique(),
  status: text("status").$type<ReconStatus>().notNull(),
  summary: jsonb("summary").$type<ReconSummary>().notNull(),
  /** Flutterwave available balance vs our ledger's Flutterwave cash account, at run time. */
  balanceTheirs: kobo("balance_theirs"),
  balanceOurs: kobo("balance_ours"),
  runById: integer("run_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: createdAt(),
});

export type ReconIssue = "missing_ours" | "missing_theirs" | "amount_mismatch" | "status_mismatch";
export const reconciliationItems = pgTable("reconciliation_items", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").notNull().references(() => reconciliationRuns.id, { onDelete: "cascade" }),
  kind: text("kind").$type<"payout" | "collection">().notNull(),
  reference: text("reference").notNull(),
  issue: text("issue").$type<ReconIssue>().notNull(),
  ourAmount: kobo("our_amount"),
  theirAmount: kobo("their_amount"),
  details: jsonb("details").$type<Record<string, unknown>>(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedById: integer("resolved_by_id").references(() => users.id, { onDelete: "set null" }),
  resolutionNote: text("resolution_note"),
}, (t) => [index("reconciliation_items_run_idx").on(t.runId)]);

export type Notification = typeof notifications.$inferSelect;
