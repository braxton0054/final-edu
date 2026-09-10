import Redis from "ioredis";

let redis: Redis | null = null;
let redisDown = false;

function client(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url || redisDown) return null;
  if (!redis) {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    redis.on("error", () => {
      redisDown = true; // fall back to memory until restart
    });
  }
  return redis;
}

// In-memory fallback (single instance / dev without Redis).
const mem = new Map<string, { count: number; reset: number }>();

function memCheck(key: string, limit: number, windowSec: number): { ok: boolean; remaining: number } {
  const now = Date.now();
  const entry = mem.get(key);
  if (!entry || entry.reset <= now) {
    mem.set(key, { count: 1, reset: now + windowSec * 1000 });
    return { ok: true, remaining: limit - 1 };
  }
  entry.count++;
  return { ok: entry.count <= limit, remaining: Math.max(0, limit - entry.count) };
}

// Sliding-window-ish counter: fixed window via INCR + EXPIRE.
// Uses Redis when REDIS_URL is set, memory otherwise.
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<{ ok: boolean; remaining: number }> {
  const r = client();
  if (!r) return memCheck(key, limit, windowSec);
  try {
    await r.connect().catch(() => null);
    const count = await r.incr(key);
    if (count === 1) await r.expire(key, windowSec);
    const ttl = await r.ttl(key);
    void ttl;
    return { ok: count <= limit, remaining: Math.max(0, limit - count) };
  } catch {
    redisDown = true;
    return memCheck(key, limit, windowSec);
  }
}

export function rateLimitHeaders(remaining: number, limit: number) {
  return {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
  };
}

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
