# DigitMonie web app

Savings, investments, loans and payments for Nigeria (Naira first). Same stack as the academy app:
Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript, Zod.

```bash
npm install
npm run dev     # http://localhost:3002
```

## What's here (UI phase)

| Area | Routes |
|---|---|
| Landing page | `/` with animated hero, Save/Invest/Borrow calculator, products, security, FAQ |
| Auth | `/login`, `/register` |
| Customer app | `/dashboard`, `/wallet`, `/transactions`, `/savings`, `/investments`, `/loans`, `/settings` (all under `/dashboard`) |
| Staff/admin console | `/console`, `/customers`, `/kyc`, `/loans`, `/transactions`, `/products`, `/team` (all under `/console`) |

## Accounts and sign-in

- **Database:** Postgres when `DATABASE_URL` is set; otherwise an embedded PGlite database in `.data/` (created and seeded by `npm run dev`). Schema in `src/db/schema.ts`, migrations in `drizzle/` (`npm run db:generate` after schema changes).
- **Customers** sign up with phone + email + password, confirm their phone with a 6-digit SMS code, then create a 4-digit transaction PIN. Password reset is by code.
- **Staff** are invite-only (Console → Team & roles). They set a password from the emailed link and must use an authenticator app (two-factor) on every sign-in.
- Sessions are signed cookies (12 h customers, 8 h staff), re-checked against the database on every request, so role changes and deactivation apply immediately.
- Sign-in, codes and PINs are rate limited; five wrong PINs lock PIN use for 30 minutes.
- Every staff action and security change is written to the audit log (Console → Audit log).

Without `TERMII_API_KEY` / `RESEND_API_KEY`, codes and invitation emails are printed to the server log, and in development the code is shown on the verification screen.

**Local demo accounts** (created by the seed in development only):

| Role | Email / phone | Password |
|---|---|---|
| Administrator | admin@digitmonie.local | AdminPass123! |
| Staff | staff@digitmonie.local | StaffPass123! |
| Customer | customer@digitmonie.local / 0803 000 0001 | CustomerPass123! (PIN 2580) |

Staff accounts set up two-factor on their first sign-in.

## Identity verification (KYC)

Customers verify in three CBN tiers at **Verify identity** (`/dashboard/verify`):

| Tier | Customer provides | Decided by |
|---|---|---|
| 1 | BVN + date of birth | Automatic: name and birth date must match the BVN record |
| 2 | NIN + selfie | Automatic face match (≥ 90% passes, 70–89% goes to staff, < 70% fails) |
| 3 | Address + proof of address | Staff, in Console → KYC reviews |

- BVN and NIN are encrypted at rest; a keyed hash stops one BVN/NIN being used on two accounts. Consent is recorded.
- Selfies, ID photos and documents are stored privately in the database and only served to staff with `kyc.review`; each view is written to the audit log.
- Limits and thresholds live in `src/lib/kyc/tiers.ts`. Confirm the limits with your partner bank.
- **Provider:** set `KYC_PROVIDER=dojah` with `DOJAH_APP_ID` / `DOJAH_SECRET_KEY` (`DOJAH_ENV=live` for production). Without it, a built-in test provider is used in development:
  BVN/NIN ending `0000` → not found · starting `1` → someone else's · NIN ending `1` → face 78% (staff review) · NIN ending `2` → face 41% (rejected) · anything else → match.

## Lending

- **Products** (Console → Products): amount range, repayment periods, monthly rate (reducing or flat), processing and late fees, minimum KYC tier, when to ask for a bank statement and how much can be auto-approved. Edits only affect new applications.
- **Applying** (`/dashboard/loans/apply`): the customer sees a key-facts summary (amount received, fees, total repayable, APR, schedule) before accepting the terms and confirming with their PIN.
- **Assessment:** a transparent rules-based score (`src/lib/credit/score.ts`) using KYC tier, repayment-to-income, DigitMonie history and the credit bureau report. Hard stops (e.g. delinquent elsewhere, repayment over 50% of income) decline automatically. Strong small applications can be approved automatically if the product allows.
- **Limits** start at ₦50k / ₦200k / ₦1m for KYC Tier 1 / 2 / 3 and grow 50% per loan repaid on time (`src/lib/credit/limits.ts`). Staff can override.
- **Four eyes:** one person reviews (`loans.review`), a different person approves (`loans.approve`).
- **Payouts** (Settings → Loan payouts): *Manual* (staff send the transfer and record its reference) or *Automatic* (DigitMonie sends it through Flutterwave as soon as a loan is approved, up to a limit you set). Staff can always send through Flutterwave or record a manual payout from the loan page. Transfers are confirmed with Flutterwave (webhook, "Check status", and the daily job), and failures are listed under Console → Money.
- **Bank account check:** customers' payout accounts are looked up with the bank as they type, and must be in their own (BVN) name.
- **Repayments:** customers pay through Paystack (`PAYSTACK_SECRET_KEY`; webhook `/api/webhooks/paystack`). Staff with `loans.collect` can record transfers received. Payments go to the oldest instalment first.
- **Overdue:** a daily job (`/api/cron/loans`, `CRON_SECRET`, scheduled in `vercel.json`) marks instalments overdue, adds the one-off late fee, and sends reminders 3 days before due dates. Pages also run it when opened.
- **Credit bureau:** `src/lib/credit/bureau.ts` defines the adapter; a test bureau runs in development (BVN ending 9 → delinquent, 8 → many loans, else clean). Add the CRC/FirstCentral adapter once subscribed.

## Operations

- **Notifications:** customers and staff get in-app notifications (the bell), plus SMS/email for important customer events using a branded email template. Staff are alerted to work waiting for their role (new applications, approvals, payouts, failed transfers, KYC reviews, broken promises, reconciliation issues).
- **Customers** (Console → Customers → a customer): profile, identity, credit, loans, a contact log, activity, and (with `users.manage`) restrict/freeze/close, unlock PIN, sign out everywhere.
- **Collections** (Console → Collections, `loans.collect`): overdue worklist by days overdue, collector assignment, contact log, promises to pay (marked kept/broken automatically), reminder SMS (once a day, 8am–6pm), and for `loans.approve` rescheduling and write-offs (loss posted to the ledger; later payments booked as recoveries).
- **Reports** (Console → Reports, `reports.view`): applications funnel, collected vs disbursed, portfolio quality and PAR30, revenue/losses by month from the ledger, product performance, collections results, and CSV exports.
- **Reconciliation** (Console → Reconciliation): every morning the cron compares yesterday's Flutterwave transfers and collections with ours and snapshots Flutterwave's balance against the ledger. Staff with `finance.manage` can re-run a day, re-check/resolve issues and record funding or withdrawals. Flutterwave transfer fees are posted to the ledger automatically.

## Money and ledger

Every payout and repayment posts a balanced double-entry journal (`src/lib/ledger.ts`): cash accounts per provider, loans receivable, interest, fee and late-fee income. Console → Money shows the Flutterwave balance, payouts, repayments, payouts needing attention and the trial balance.

## Settings (Console → Settings)

Administrators (`settings.manage`) control, without a redeploy:

- **General:** support contacts, FCCPC licence number, pause new loans, pause new sign-ups.
- **Lending rules:** starting limits per KYC tier, growth per on-time loan, limit cap, auto-approval score, maximum repayment-to-income, reminder timing.
- **Identity verification:** provider (Dojah or test), Dojah keys and environment, selfie and name match thresholds.
- **Flutterwave:** public, secret and encryption keys, webhook hash (webhook URL `/api/webhooks/flutterwave`).
- **Repayments:** Flutterwave or Paystack.
- **SMS and email:** Termii and Resend keys, sender ID, from address.
- **Credit bureau:** which bureau to use.

Saved values override environment variables. Keys are encrypted with `SESSION_SECRET` and never sent back to the browser (only their last 4 characters). Each section has a read-only "Test connection" button, and every change and test is in the audit log.

## Roles & permissions

Permissions are defined in `src/lib/permissions.ts`. Roles live in the database and are managed in
Console → Team & roles: create a role (e.g. Customer support, Risk, Finance, Collections), tick its
permissions and assign people to it. The Administrator role always has every permission, and the
last active administrator can't be demoted or deactivated.

## Placeholders to replace

- Dashboard and console figures (balances, loans, KYC queue, transactions) still come from `src/lib/mock-data.ts`. Calculator rates are in `src/lib/calculators.ts`.
- The logo in `src/components/logo.tsx` is an SVG approximation. Drop in the official SVG.
- Regulatory and partner wording (NDIC, CBN partner bank, SEC) and the stats/testimonials on the landing page
  must be confirmed before going live.
