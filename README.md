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
