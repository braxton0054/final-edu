#!/usr/bin/env bash
# Production deploy for final-edu on the VPS. Called by GitHub Actions
# (deploy.yml) after every push to main. Exits non-zero on any failure.
set -euo pipefail

cd /opt/final-edu
echo "==> Pulling latest main"
git pull --ff-only origin main

echo "==> Installing dependencies"
pnpm install --frozen-lockfile

echo "==> Internal services: Evolution API (WhatsApp, loopback-only)"
# Same deployment, no second VPS/domain: Evolution runs as a container bound
# to 127.0.0.1:8080 and is only ever called by the SaaS backend.
# Non-fatal by design: WhatsApp is additive and the app degrades gracefully
# ("not configured" errors) when Evolution is down, so a WhatsApp problem
# must never block the SaaS deploy itself.
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  if docker compose -f docker-compose.prod.yml up -d evolution; then
    echo "Evolution API container is up."
  else
    echo "WARNING: Evolution API failed to start — SaaS deploy continues without WhatsApp."
  fi
else
  echo "WARNING: docker compose not found — skipping Evolution API (SaaS deploy continues without WhatsApp)."
fi

echo "==> Database: generate + migrate"
set -a
# shellcheck disable=SC1091
. /opt/final-edu/.env
set +a
pnpm db:generate
pnpm --filter @mtanda/database db:deploy

echo "==> Building web"
pnpm --filter web build

echo "==> Restarting service"
systemctl restart final-edu.service
sleep 12

echo "==> Health check"
curl -sf http://127.0.0.1:8093/api/health
curl -sf -o /dev/null https://edu.mtandaolabs.com/api/health
echo "DEPLOY OK"
