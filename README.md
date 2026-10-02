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
