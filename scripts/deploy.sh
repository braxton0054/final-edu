#!/usr/bin/env bash
# Production deploy for final-edu on the VPS. Called by GitHub Actions
# (deploy.yml) after every push to main. Exits non-zero on any failure.
set -euo pipefail

cd /opt/final-edu
echo "==> Pulling latest main"
git pull --ff-only origin main

echo "==> Installing dependencies"
pnpm install --frozen-lockfile

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
