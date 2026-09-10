# MtandaoLabs EDU

Multi-tenant school management platform for Kenyan schools — students, CBC
academics, fees with M-Pesa, parents, and communication in one place.

Built with Next.js 16 (App Router) + PostgreSQL + Prisma.

## Structure

```
apps/
  web/        Next.js app — marketing, auth, platform admin, tenant dashboard
  worker/     Reserved for background jobs (no jobs registered yet)
packages/
  database/   Prisma schema, client, and tenant/enrollment/trial helpers
  */          Reserved packages (auth, payments, email, ...) — not implemented
scripts/      deploy.sh, health-check.ts
.github/      CI, deploy, and trial-lifecycle workflows
```

The application currently lives almost entirely in `apps/web` and
`packages/database`. The other `packages/*` folders are empty placeholders for
future extraction and are not imported by any app.

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

- Web: http://localhost:3000
- Health: `GET /api/health`

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Run all apps in watch mode (Turbo) |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all packages |
| `pnpm db:generate` | Generate the Prisma client |
| `pnpm db:migrate` | Apply migrations in development |
| `pnpm db:seed` | Seed subscription plans |
| `pnpm db:studio` | Open Prisma Studio |

## Environment

See `.env.example` for the full list. Notable variables:

- `DATABASE_URL` / `DIRECT_URL` — PostgreSQL connection strings
- `NEXTAUTH_SECRET` — signs session cookies (required in production)
- `TENANT_ROOT_DOMAIN` — root domain used to resolve school subdomains
- `CRON_SECRET` — bearer token for the trial-lifecycle cron endpoint
- `SECRETS_ENCRYPTION_KEY` — AES key for per-tenant credentials stored in DB

Never commit `.env`; it is gitignored.

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`, which SSHes to the VPS
and runs `scripts/deploy.sh` (pull, install, migrate, build, restart, health
check). Required repository secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`.
