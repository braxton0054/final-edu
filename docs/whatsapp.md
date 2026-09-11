# WhatsApp (Evolution API) — internal integration

WhatsApp is a native SaaS feature. School admins never see or touch Evolution
API: they open **Settings → WhatsApp**, scan a QR code, and the platform does
the rest. Evolution runs as an **internal service of this deployment** — one
shared server, one isolated **instance per school** — and is never exposed
publicly.

## Architecture

```
School admin browser
  │  (session cookie only — no Evolution credentials, no school_id)
  ▼
Next.js SaaS backend ──► lib/whatsapp/service.ts (tenant-scoped)
  │                        │  instance name = school_<schoolId>
  │                        ▼
  │                      lib/whatsapp/evolution.ts (HTTP client, server-only)
  │                        │  apikey: EVOLUTION_API_KEY (internal)
  │                        ▼
  │                      Evolution API (loopback/internal port)
  │                        │  webhook ?secret=EVOLUTION_WEBHOOK_SECRET
  │                        ▼
  └────────────────── /api/webhooks/evolution
                         (resolves tenant by instance name → DB)

Feature modules (fees, results, …)
  ▼
lib/notifications.notify({ schoolId, event, to, … })
  ▼
lib/whatsapp.sendMessage (checks settings + connection, logs)
```

Public surface: only the SaaS domain. Internal: Evolution on a loopback port.

## Data model

- `WhatsAppStatus`: `DISCONNECTED | CONNECTING | CONNECTED | ERROR`
- `WhatsAppConnection`: one row per school (`schoolId` + `instanceName` unique).
  Stores status, phone, encrypted per-instance token, notification toggles,
  last error. Tokens are AES-256-GCM encrypted and never leave the server.
- `WhatsAppMessage`: per-school outbound/inbound log with delivery status.
- Migration: `packages/database/prisma/migrations/*_whatsapp/migration.sql`.

## Environment

| Variable | Purpose |
| --- | --- |
| `EVOLUTION_API_URL` | Internal Evolution base URL. Dev: `http://localhost:8080`. VPS: `http://127.0.0.1:8080`. |
| `EVOLUTION_API_KEY` | Master key (`AUTHENTICATION_API_KEY` on the Evolution side). Server-only. |
| `EVOLUTION_WEBHOOK_SECRET` | Shared secret Evolution sends back on every event (`?secret=`). Generate with `openssl rand -hex 32`. |
| `EVOLUTION_WEBHOOK_URL` | Internal base URL Evolution uses to reach Next.js. Docker dev: `http://web:3000` (default). VPS: `http://127.0.0.1:8093`. |
| `EVOLUTION_DB_URI` / `EVOLUTION_REDIS_URI` | Prod overrides for Evolution's own postgres/redis. |

## Tenant API (session-derived school, rate-limited)

| Method & path | Purpose |
| --- | --- |
| `POST /api/whatsapp/connect` | Create/reuse instance, return fresh QR |
| `GET /api/whatsapp/qrcode` | Fresh QR (or live status if connected) |
| `GET /api/whatsapp/status` | Live status, probed against Evolution |
| `POST /api/whatsapp/send` | Send one message (`to`, `text`, `event?`) |
| `POST /api/whatsapp/disconnect` | Log the session out |
| `POST /api/whatsapp/reconnect` | Restart instance, return fresh QR |
| `GET/PATCH /api/whatsapp/settings` | Notification toggles |
| `POST /api/webhooks/evolution?secret=` | Evolution events (secret-guarded) |
| `GET /api/admin/whatsapp` | Super-admin status overview (no tokens/bodies) |

## Webhook events handled

`CONNECTION_UPDATE` (open → CONNECTED + phone, close → DISCONNECTED + reason,
connecting → CONNECTING), `MESSAGES_UPSERT` (inbound logged, own-echo promotes
outbound to SENT), `MESSAGES_UPDATE` (SENT/DELIVERED/READ), `SEND_MESSAGE`
(attaches provider id). Unknown instances are acked and ignored. The tenant is
resolved **only** by looking up the event's `instance` in `whatsapp_connections`.

## Test locally

1. `cp .env.example .env` and set `EVOLUTION_API_KEY` (any dev value) and
   `EVOLUTION_WEBHOOK_SECRET` (`openssl rand -hex 32`).
2. `docker compose up -d` — postgres, redis, evolution (loopback `:8080`).
   First boot also creates the separate `evolution` database.
3. `pnpm db:generate && pnpm db:migrate && pnpm db:seed && pnpm dev`
   (web on `:3000`, Evolution internal).
4. Register a school, sign in as its admin, open **Settings → WhatsApp**,
   click **Connect WhatsApp**, scan the QR with the school phone.
   Status flips to CONNECTED with the number; disconnect/reconnect and the
   notification toggles are on the same page.
5. Send path: `POST /api/whatsapp/send` with the admin session cookie.
   Notifications: call `notify({ schoolId, event: "fee_invoice", to, data })`
   from any server module — delivery honours the school's toggles.
6. Watch `audit_logs` (`whatsapp.*`) and `whatsapp_messages` for the trail.

Without Evolution running, every endpoint returns a clear
"not configured" error — nothing hangs.

## Deploy to production

Pushing to `main` runs `scripts/deploy.sh`, which now also brings up the
internal Evolution container (`docker-compose.prod.yml`, port bound to
`127.0.0.1:8080`). One-time VPS setup:

1. In `/opt/final-edu/.env` set `EVOLUTION_API_URL=http://127.0.0.1:8080`,
   `EVOLUTION_API_KEY=<master key>`,
   `EVOLUTION_WEBHOOK_SECRET=<openssl rand -hex 32>`,
   `EVOLUTION_WEBHOOK_URL=http://127.0.0.1:8093`.
2. Create Evolution's database once:
   `psql "$DATABASE_URL" -c "CREATE DATABASE evolution;"`
3. Allow the container to reach host postgres/redis
   (`host.docker.internal` via `extra_hosts`, `listen_addresses` + `pg_hba`).
4. Push to `main`; verify `https://<saas>/api/health` and
   Super Admin → WhatsApp.

## Tenant isolation checklist

- Instance names are server-generated (`school_<schoolId>`); the browser never
  supplies them.
- Every tenant route derives `schoolId` from the verified session cookie
  (`requireSchoolActor`); PLATFORM_ADMIN has no school and is rejected.
- Webhook tenant = DB lookup by `instance`; unknown instances ignored.
- Master key, instance tokens, and message bodies never reach the browser;
  the admin overview exposes status counts only.
