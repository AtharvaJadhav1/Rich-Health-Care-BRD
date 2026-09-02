# Rich Health Care

Direct-selling / MLM platform from BRD v5.0: PAN registration with system-issued credentials, binary-tree placement, manual payment approval, KYC, PIN generate/transfer/use, matching income with a 10-pair daily cap, wallet/ledger, member dashboard, profile, and admin queues.

Stack: **Fastify + TypeScript**, **Prisma** (SQLite for local), **Next.js + Tailwind + shadcn/ui**.

## Run locally

```bash
npm install
npm run db:setup
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). The Next.js app proxies `/api/*` to Fastify on port **43124**.

## Demo accounts

| Role | Member ID | Password |
| --- | --- | --- |
| Admin | `ADMIN` | `Admin@123` |
| Root distributor | `RHC0001` | `Member@123` |

Seeded tree under Priya Sharma (`RHC0001`): Amit left, Kavita right, Neha/Rohan under Amit. Today’s binary volume is pre-counted so admin can **Run today’s matching** immediately.

## Phase 1 working assumptions (from the BRD)

- PAN is format-checked only (not a live NSDL/Karza call)
- Generated Member ID + password are shown once on-screen (and visible to admin until first login). No SMS gateway.
- KYC is a real submit/review workflow but does **not** block PIN, orders, or matching
- An unused PIN substitutes for the ₹999 joining payment and activates the member

## Tests

```bash
npm test
```
