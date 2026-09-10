# MtandaoLabs EDU

Multi-tenant school management platform (Next.js + PostgreSQL + Prisma).

## Structure
- `apps/web` — Next.js 15 App Router (marketing, auth, platform admin, tenant, teacher, parent)
- `apps/worker` — background jobs (email, WhatsApp, M-Pesa, PDF, reports)
- `packages/database` — Prisma schema + tenant helpers (PostgreSQL)
- `packages/*` — auth, tenant, payments (M-Pesa), email, whatsapp, pdf, etc.
- `infrastructure/` — docker, nginx, postgres, redis configs
- `tests/`, `scripts/`, `docs/`

## Quickstart
```bash
cp .env.example .env
pnpm install
# start postgres + redis (needs docker) OR use local postgres:
# createdb mtandaolabsedu
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Web: http://localhost:3000 — health: `/api/health`
