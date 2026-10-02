// Everything administrators can change in Console → Settings. Shared by the settings page (labels,
// inputs) and the server (defaults, environment fallbacks). Saved values override environment variables.

export type FieldType = "text" | "secret" | "number" | "percent" | "naira" | "boolean" | "select";
export type Field = {
  key: string;
  label: string;
  type: FieldType;
  help?: string;
  default: string | number | boolean;
  /** Environment variable used when nothing has been saved. */
  env?: string;
  options?: { value: string; label: string }[];
  /** Used instead of `default` in local development (e.g. test providers). */
  devDefault?: string | number | boolean;
  min?: number;
  max?: number;
};
export type Integration = "flutterwave" | "paystack" | "dojah" | "termii" | "resend";
export type Section = {
  id: string; title: string; description: string; fields: Field[]; tests?: Integration[];
  /** Rendered by its own component instead of the generic form (fields are still saved the generic way). */
  custom?: "email" | "templates";
};

export const SECTIONS: Section[] = [
  {
    id: "general",
    title: "General",
    description: "Company details and switches that affect everyone.",
    fields: [
      { key: "supportEmail", label: "Support email", type: "text", default: "hello@digitmonie.com" },
      { key: "supportPhone", label: "Support phone", type: "text", default: "" },
      { key: "fccpcLicence", label: "FCCPC licence / registration number", type: "text", default: "", help: "Shown to customers in loan terms." },
      { key: "pauseLoans", label: "Pause new loan applications", type: "boolean", default: false, help: "Existing loans and repayments carry on as normal." },
      { key: "pauseSignups", label: "Pause new sign-ups", type: "boolean", default: false },
    ],
  },
  {
    id: "lending",
    title: "Lending rules",
    description: "How limits grow and when applications are approved without staff. Loan products (rates, fees, amounts) are under Products.",
    fields: [
      { key: "limitTier1", label: "Starting limit, KYC Tier 1", type: "naira", default: 50_000 },
      { key: "limitTier2", label: "Starting limit, KYC Tier 2", type: "naira", default: 200_000 },
      { key: "limitTier3", label: "Starting limit, KYC Tier 3", type: "naira", default: 1_000_000 },
      { key: "limitGrowth", label: "Limit growth per loan repaid on time", type: "percent", default: 50, min: 0, max: 200 },
      { key: "limitCap", label: "Highest calculated limit", type: "naira", default: 5_000_000, help: "Staff can still set a higher limit for one customer." },
      { key: "autoApproveScore", label: "Score needed for automatic approval", type: "number", default: 70, min: 0, max: 100, help: "Also requires the product to allow it and a credit bureau check." },
      { key: "maxRepaymentToIncome", label: "Decline when repayment is above this share of income", type: "percent", default: 50, min: 10, max: 100 },
      { key: "reminderDays", label: "Send repayment reminders this many days before", type: "number", default: 3, min: 0, max: 14 },
    ],
  },
  {
    id: "kyc",
    title: "Identity verification",
    description: "Who checks BVN, NIN and selfies, and how strict the automatic checks are.",
    tests: ["dojah"],
    fields: [
      { key: "kycProvider", label: "Provider", type: "select", default: "sandbox", env: "KYC_PROVIDER", help: "The test provider is refused in production.", options: [{ value: "sandbox", label: "Test provider (no real checks)" }, { value: "dojah", label: "Dojah" }] },
      { key: "dojahAppId", label: "Dojah App ID", type: "text", default: "", env: "DOJAH_APP_ID" },
      { key: "dojahSecretKey", label: "Dojah secret key", type: "secret", default: "", env: "DOJAH_SECRET_KEY" },
      { key: "dojahEnv", label: "Dojah environment", type: "select", default: "sandbox", env: "DOJAH_ENV", options: [{ value: "sandbox", label: "Sandbox" }, { value: "live", label: "Live" }] },
      { key: "faceAutoApprove", label: "Selfie match needed to pass automatically (%)", type: "number", default: 90, min: 50, max: 100 },
      { key: "faceReview", label: "Selfie match below this is rejected (%)", type: "number", default: 70, min: 30, max: 100, help: "Between the two goes to staff review." },
      { key: "nameMatch", label: "Name match needed to pass automatically (%)", type: "number", default: 80, min: 50, max: 100 },
    ],
  },
  {
    id: "flutterwave",
    title: "Flutterwave",
    description: "Payments partner for repayments now, and for payouts and account numbers in Step 4. Find the keys in your Flutterwave dashboard under Settings → API.",
    tests: ["flutterwave"],
    fields: [
      { key: "flwPublicKey", label: "Public key", type: "text", default: "", env: "FLW_PUBLIC_KEY" },
      { key: "flwSecretKey", label: "Secret key", type: "secret", default: "", env: "FLW_SECRET_KEY" },
      { key: "flwEncryptionKey", label: "Encryption key", type: "secret", default: "", env: "FLW_ENCRYPTION_KEY" },
      { key: "flwWebhookHash", label: "Webhook secret hash", type: "secret", default: "", env: "FLW_WEBHOOK_HASH", help: "Set the same value in Flutterwave → Settings → Webhooks, with the URL https://<your domain>/api/webhooks/flutterwave." },
    ],
  },
  {
    id: "payouts",
    title: "Loan payouts",
    description: "How approved loans reach the customer's bank account.",
    fields: [
      { key: "payoutMode", label: "Payout method", type: "select", default: "manual", options: [{ value: "manual", label: "Manual: staff send the transfer and record the reference" }, { value: "automatic", label: "Automatic: DigitMonie sends it through Flutterwave on approval" }], help: "Staff can always pay out manually, for example if an automatic transfer fails." },
      { key: "autoPayoutMax", label: "Largest automatic payout", type: "naira", default: 500_000, help: "Bigger loans wait for a staff member to press Send, even in automatic mode." },
      { key: "payoutNameCheck", label: "Only pay into accounts in the customer's own name", type: "boolean", default: true, help: "The account name from the bank must match the name on their BVN." },
      { key: "payoutNameMatch", label: "Account name match needed (%)", type: "number", default: 70, min: 40, max: 100 },
    ],
  },
  {
    id: "payments",
    title: "Repayments",
    description: "Which provider customers pay their loans through.",
    tests: ["paystack"],
    fields: [
      { key: "repaymentProvider", label: "Take repayments with", type: "select", default: "flutterwave", options: [{ value: "flutterwave", label: "Flutterwave" }, { value: "paystack", label: "Paystack" }] },
      { key: "paystackSecretKey", label: "Paystack secret key (only if using Paystack)", type: "secret", default: "", env: "PAYSTACK_SECRET_KEY" },
    ],
  },
  {
    id: "email",
    title: "Email",
    description: "How DigitMonie sends email: one-time codes, staff invitations, and loan and verification updates.",
    custom: "email",
    fields: [
      { key: "otpChannel", label: "Send one-time codes by", type: "select", default: "email", options: [{ value: "email", label: "Email" }, { value: "sms", label: "SMS (Termii)" }, { value: "both", label: "Email and SMS" }], help: "Codes for confirming a new account and resetting a password." },
      { key: "emailDriver", label: "Send email with", type: "select", default: "resend", options: [{ value: "resend", label: "Resend" }, { value: "smtp", label: "Your own mail server (SMTP)" }, { value: "log", label: "Don't send (log only)" }] },
      { key: "resendApiKey", label: "Resend API key", type: "secret", default: "", env: "RESEND_API_KEY" },
      { key: "smtpHost", label: "SMTP host", type: "text", default: "" },
      { key: "smtpPort", label: "SMTP port", type: "number", default: 465, min: 1, max: 65535 },
      { key: "smtpSecurity", label: "Encryption", type: "select", default: "ssl", options: [{ value: "ssl", label: "SSL (port 465)" }, { value: "tls", label: "TLS (port 587)" }, { value: "none", label: "None" }] },
      { key: "smtpUser", label: "SMTP username", type: "text", default: "" },
      { key: "smtpPassword", label: "SMTP password", type: "secret", default: "" },
      { key: "emailFromName", label: "Sender name", type: "text", default: "DigitMonie" },
      { key: "emailFromAddress", label: "Sender address", type: "text", default: "", env: "EMAIL_FROM_ADDRESS" },
      { key: "emailReplyTo", label: "Reply-to", type: "text", default: "" },
    ],
  },
  {
    id: "templates",
    title: "Email templates",
    description: "The wording of every automatic email.",
    custom: "templates",
    fields: [],
  },
  {
    id: "messaging",
    title: "SMS",
    description: "Termii sends SMS: loan alerts and reminders, and one-time codes if you choose SMS under Email.",
    tests: ["termii"],
    fields: [
      { key: "termiiApiKey", label: "Termii API key", type: "secret", default: "", env: "TERMII_API_KEY" },
      { key: "termiiSenderId", label: "SMS sender ID", type: "text", default: "DigitMonie", env: "TERMII_SENDER_ID", help: "Must be approved by Termii." },
    ],
  },
  {
    id: "bureau",
    title: "Credit bureau",
    description: "Used to check applicants and report loans. Without one, applications always go to staff.",
    fields: [
      { key: "creditBureau", label: "Bureau", type: "select", default: "none", devDefault: "sandbox", env: "CREDIT_BUREAU", options: [{ value: "none", label: "None connected" }, { value: "sandbox", label: "Test bureau (no real checks)" }] },
    ],
  },
];

export const FIELDS = new Map(SECTIONS.flatMap((s) => s.fields.map((f) => [f.key, f] as const)));
