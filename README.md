# Rich Health Care

Direct-selling / MLM platform from the simplified BRD: member registration, binary-tree placement, manual payment approval, matching income with a 10-pair daily cap, wallet/ledger, member dashboard, and a small admin panel.

Stack: **Fastify + TypeScript**, **Prisma** (SQLite for local; schema is the same as the BRD), **Next.js + Tailwind + shadcn/ui**.

## Run locally

```bash
npm install
npm run db:setup
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). The Next.js app proxies `/api/*` to Fastify on port **43124**.

## Demo accounts

| Role | Phone | Password | Code |
| --- | --- | --- | --- |
| Admin | `9999999999` | `Admin@123` | ADMIN |
| Root distributor | `9000000001` | `Member@123` | `RHC0001` |

Seeded tree under Priya Sharma (`RHC0001`): Amit left, Kavita right, Neha/Rohan under Amit. Today’s binary volume is pre-counted so admin can **Run today’s matching** immediately.

## What is in this phase

- Public Home / About / Products / Contact
- Register with a mandatory **active** sponsor code (auto-spillover, left-first BFS)
- JWT login (member + admin)
- Manual UTR payment for joining (₹999) and product orders
- Admin approve/reject — **no binary count or wallet credit before approval**
- Retail income ₹500/unit on approved orders
- Matching job: `pairs = min(left, right, 10)`, GST 5% + admin 5%, leftover carries forward
- Wallet balance = sum of append-only ledger entries
- Member pairing diagram with today’s pairs and L/R carry-forward
- Admin: pending queue, member block/rank, product CRUD, plan config, CSV exports

Plan values live in `PlanConfig`, not in hardcoded payout math (except seed defaults).

## Tests

```bash
npm test
```

Covers the matching formula, 10-pair cap, and carry-forward.

## PostgreSQL later

Swap the Prisma `provider` to `postgresql` and set `DATABASE_URL`. The models match the BRD; SQLite is used here so the app runs without Docker.
