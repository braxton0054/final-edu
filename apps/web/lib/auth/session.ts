import { createHmac, timingSafeEqual } from "node:crypto";

export type Session = {
  userId: string;
  email: string;
  userType: string;
  schoolId: string | null;
  exp: number;
};

const COOKIE = "mtanda_session";
const MAX_AGE = 7 * 24 * 60 * 60; // 7 days

function key(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret && secret.length > 0) return secret;
  // A known fallback secret would make every session cookie forgeable, so
  // never allow one in production.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXTAUTH_SECRET is not set. Refusing to sign sessions with an insecure key in production."
    );
  }
  return "dev-only-insecure-key";
}

function sign(data: string): string {
  return createHmac("sha256", key()).update(data).digest("base64url");
}

export function createSessionToken(session: Omit<Session, "exp">): string {
  const payload = Buffer.from(
    JSON.stringify({ ...session, exp: Math.floor(Date.now() / 1000) + MAX_AGE })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined): Session | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    if (session.exp < Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE;
export const SESSION_MAX_AGE = MAX_AGE;
