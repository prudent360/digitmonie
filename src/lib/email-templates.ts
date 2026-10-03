/**
 * Built-in email templates. Admins can override the subject and body of each one
 * (Console → Settings → Email templates); overrides live in the email_templates table.
 *
 * Bodies are Markdown. {{variable}} inserts a value and [[Button label|{{url}}]]
 * on its own line renders a button.
 */
export type TemplateDef = {
  name: string;
  group: "Security" | "Loans" | "Verification" | "Account";
  description: string;
  /** Variable → sample value used for previews and test sends. */
  variables: Record<string, string>;
  subject: string;
  body: string;
};

/** Available in every template. */
export const COMMON_VARIABLES: Record<string, string> = {
  name: "Adaeze",
  siteName: "DigitMonie",
  siteUrl: "https://digitmonie.com",
  supportEmail: "hello@digitmonie.com",
};

export const EMAIL_TEMPLATES = {
  verification_code: {
    name: "Verification code",
    group: "Security",
    description: "Sent when someone opens an account, to confirm their email address.",
    variables: { code: "482913", minutes: "10" },
    subject: "Your {{siteName}} code: {{code}}",
    body: `Hi {{name}},

Use this code to confirm your email address and finish opening your account:

# {{code}}

It expires in {{minutes}} minutes. **Never share this code with anyone**, including anyone who says they work for {{siteName}}.

If you didn't try to open an account, you can ignore this email.`,
  },
  password_reset_code: {
    name: "Password reset code",
    group: "Security",
    description: "Sent when someone uses \"Forgot password\".",
    variables: { code: "730158", minutes: "10" },
    subject: "Your {{siteName}} password reset code: {{code}}",
    body: `Hi {{name}},

Use this code to reset your password:

# {{code}}

It expires in {{minutes}} minutes. Resetting your password signs you out on all your devices.

If you didn't ask for this, ignore this email and your password stays the same. **Never share this code with anyone.**`,
  },
  staff_invite: {
    name: "Staff invitation",
    group: "Security",
    description: "Sent when an administrator invites someone to the console.",
    variables: { role: "Customer support", invitedBy: "Ifiok Udo", inviteUrl: "https://digitmonie.com/invite/sample" },
    subject: "You've been invited to the {{siteName}} console",
    body: `Hi {{name}},

**{{invitedBy}}** has invited you to join {{siteName}} as **{{role}}**.

[[Set your password|{{inviteUrl}}]]

The link works once and expires in 7 days. Have your phone ready: you may be asked to set up two-factor sign-in with an authenticator app.`,
  },
  welcome: {
    name: "Welcome",
    group: "Account",
    description: "Sent once a new customer has confirmed their account.",
    variables: { dashboardUrl: "https://digitmonie.com/dashboard/verify" },
    subject: "Welcome to {{siteName}}",
    body: `Hi {{name}},

Welcome to **{{siteName}}**. Your account is ready.

Next, verify your BVN to see your loan limit. It takes about a minute:

[[Verify my identity|{{dashboardUrl}}]]

We'll never ask for your PIN, password or one-time codes.`,
  },
  account_update: {
    name: "Account status change",
    group: "Account",
    description: "Sent when staff restrict, freeze or reactivate an account.",
    variables: { message: "Your DigitMonie account is fully active again." },
    subject: "An update about your {{siteName}} account",
    body: `Hi {{name}},

{{message}}

If you have questions, reply to this email or write to {{supportEmail}}.`,
  },
  kyc_approved: {
    name: "Verification approved",
    group: "Verification",
    description: "Sent when staff approve a KYC tier after review.",
    variables: { tier: "2", verifyUrl: "https://digitmonie.com/dashboard/verify" },
    subject: "Tier {{tier}} verification approved",
    body: `Hi {{name}},

Good news: your **Tier {{tier}}** verification is approved and your new limits are active now.

[[See my limits|{{verifyUrl}}]]`,
  },
  kyc_rejected: {
    name: "Verification not approved",
    group: "Verification",
    description: "Sent when staff reject a KYC submission. Includes the reason they gave.",
    variables: { tier: "3", reason: "The utility bill is older than 3 months.", verifyUrl: "https://digitmonie.com/dashboard/verify" },
    subject: "About your Tier {{tier}} verification",
    body: `Hi {{name}},

We couldn't approve your **Tier {{tier}}** verification:

> {{reason}}

You can fix this and try again in the app:

[[Try again|{{verifyUrl}}]]`,
  },
  loan_approved: {
    name: "Loan approved",
    group: "Loans",
    description: "Sent when a loan is approved (by staff or automatically).",
    variables: { reference: "LN-7K4M2QX", amount: "₦50,000", payout: "₦49,500", bank: "GTBank", loansUrl: "https://digitmonie.com/dashboard/loans" },
    subject: "Your {{amount}} loan is approved",
    body: `Hi {{name}},

Your loan **{{reference}}** for **{{amount}}** is approved. We'll send **{{payout}}** to your {{bank}} account shortly.

[[View my loan|{{loansUrl}}]]`,
  },
  loan_declined: {
    name: "Loan not approved",
    group: "Loans",
    description: "Sent when an application is declined. Includes the reason.",
    variables: { reference: "LN-7K4M2QX", reason: "Your repayments would be too high for your declared income.", loansUrl: "https://digitmonie.com/dashboard/loans" },
    subject: "About your loan application {{reference}}",
    body: `Hi {{name}},

We can't approve your loan application **{{reference}}** right now:

> {{reason}}

Repaying any current loans on time and completing more verification tiers can improve future applications.

[[View my loans|{{loansUrl}}]]`,
  },
  loan_paid_out: {
    name: "Loan paid out",
    group: "Loans",
    description: "Sent when the money reaches the customer's bank account.",
    variables: { reference: "LN-7K4M2QX", payout: "₦49,500", bank: "GTBank", instalment: "₦26,000", firstDue: "2 Nov 2026", loansUrl: "https://digitmonie.com/dashboard/loans" },
    subject: "We've sent {{payout}} to your {{bank}} account",
    body: `Hi {{name}},

We've sent **{{payout}}** to your {{bank}} account for loan **{{reference}}**.

Your first repayment of **{{instalment}}** is due on **{{firstDue}}**. You can repay early at any time.

[[See my repayment schedule|{{loansUrl}}]]`,
  },
  payment_received: {
    name: "Payment received",
    group: "Loans",
    description: "Sent after each repayment, unless it clears the loan.",
    variables: { reference: "LN-7K4M2QX", amount: "₦26,000", remaining: "₦26,000", loansUrl: "https://digitmonie.com/dashboard/loans" },
    subject: "We received {{amount}}",
    body: `Hi {{name}},

Thank you. We received **{{amount}}** for loan **{{reference}}**. **{{remaining}}** is left to pay.

[[View my loan|{{loansUrl}}]]`,
  },
  loan_repaid: {
    name: "Loan fully repaid",
    group: "Loans",
    description: "Sent when the last repayment clears the loan.",
    variables: { reference: "LN-7K4M2QX", loansUrl: "https://digitmonie.com/dashboard/loans" },
    subject: "Loan {{reference}} is fully repaid 🎉",
    body: `Hi {{name}},

Your loan **{{reference}}** is fully repaid. Thank you for paying on time; it may increase your loan limit.

[[See my limit|{{loansUrl}}]]`,
  },
  repayment_due: {
    name: "Repayment reminder",
    group: "Loans",
    description: "Sent a few days before each due date (Settings → Lending rules).",
    variables: { reference: "LN-7K4M2QX", amount: "₦26,000", dueDate: "2 Nov 2026", loansUrl: "https://digitmonie.com/dashboard/loans" },
    subject: "Reminder: {{amount}} due on {{dueDate}}",
    body: `Hi {{name}},

A friendly reminder that **{{amount}}** for loan **{{reference}}** is due on **{{dueDate}}**.

[[Pay now|{{loansUrl}}]]`,
  },
  repayment_overdue: {
    name: "Repayment overdue",
    group: "Loans",
    description: "Sent when an instalment becomes overdue and the late fee is added.",
    variables: { reference: "LN-7K4M2QX", amount: "₦26,260", loansUrl: "https://digitmonie.com/dashboard/loans" },
    subject: "Your repayment of {{amount}} is overdue",
    body: `Hi {{name}},

Your repayment of **{{amount}}** for loan **{{reference}}** is now overdue. Please pay today; late repayments are reported to credit bureaus and can affect your ability to borrow.

[[Pay now|{{loansUrl}}]]

Having trouble paying? Reply to this email and we'll work out a plan with you.`,
  },
  loan_rescheduled: {
    name: "New repayment schedule",
    group: "Loans",
    description: "Sent when staff reschedule a loan.",
    variables: { reference: "LN-7K4M2QX", loansUrl: "https://digitmonie.com/dashboard/loans" },
    subject: "Your loan {{reference}} has a new repayment schedule",
    body: `Hi {{name}},

As agreed, your loan **{{reference}}** has a new repayment schedule. Open the app to see your new dates.

[[See my new schedule|{{loansUrl}}]]`,
  },
} satisfies Record<string, TemplateDef>;

export type TemplateKey = keyof typeof EMAIL_TEMPLATES;

/** Security emails can't be switched off. */
export const REQUIRED_TEMPLATES: TemplateKey[] = ["verification_code", "password_reset_code", "staff_invite"];

export const isTemplateKey = (key: string): key is TemplateKey => key in EMAIL_TEMPLATES;
