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

**Preview mode:** the login page has "explore as Customer / Staff / Admin" buttons. This sets an
unsigned demo cookie (`src/lib/session.ts`). It is not real authentication; replace it before launch.

## Roles & permissions

`src/lib/roles.ts` is the single source of truth. Add a role (e.g. `support`, `risk`, `finance`)
to `ROLES`, grant it permissions in `ROLE_PERMISSIONS`, and the console sidebar, page guards and
the permission matrix on `/console/team` pick it up automatically.

## Placeholders to replace

- All figures come from `src/lib/mock-data.ts`. Calculator rates are in `src/lib/calculators.ts`.
- The logo in `src/components/logo.tsx` is an SVG approximation. Drop in the official SVG.
- Regulatory and partner wording (NDIC, CBN partner bank, SEC) and the stats/testimonials on the landing page
  must be confirmed before going live.
