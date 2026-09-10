#!/usr/bin/env tsx
// Checks that the running web app answers its health endpoint.
// Usage: tsx scripts/health-check.ts [url]
// Exits non-zero when the endpoint is unreachable or unhealthy.

const target =
  process.argv[2] ?? process.env.HEALTHCHECK_URL ?? "http://127.0.0.1:3000/api/health";

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10_000);

try {
  const res = await fetch(target, { signal: controller.signal });
  if (!res.ok) {
    console.error(`Health check failed: ${target} returned HTTP ${res.status}`);
    process.exit(1);
  }
  console.log(`Health check OK: ${target}`);
} catch (error) {
  console.error(`Health check failed: ${target}`);
  console.error(error);
  process.exit(1);
} finally {
  clearTimeout(timeout);
}
