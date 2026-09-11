import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type Claim = {
  userId: string;
  email: string;
  userType: string;
  schoolId: string | null;
  exp: number;
};

function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.slice();
}

// A known fallback secret would make every session cookie forgeable, so it is
// only tolerated outside production.
function sessionSecret(): string | null {
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret && secret.length > 0) return secret;
  if (process.env.NODE_ENV === "production") return null;
  return "dev-only-insecure-key";
}

// Fully verifies the HMAC-signed session cookie (not forgeable).
async function validSession(request: NextRequest): Promise<Claim | null> {
  try {
    const token = request.cookies.get("mtanda_session")?.value;
    if (!token) return null;
    const secret = sessionSecret();
    if (!secret) return null;
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlToBytes(sig),
      new TextEncoder().encode(payload)
    );
    if (!ok) return null;
    const claim = JSON.parse(
      new TextDecoder().decode(b64urlToBytes(payload))
    ) as Claim;
    if (claim.exp < Math.floor(Date.now() / 1000)) return null;
    return claim;
  } catch {
    return null;
  }
}

// Subdomains that belong to the platform itself, never to a school tenant.
const RESERVED_SUBDOMAINS = new Set([
  "www",
  "app",
  "edu",
  "admin",
  "api",
  "dashboard",
  "mail",
]);

// Resolve a school tenant slug from the request host. Only hosts that are a
// strict subdomain of the configured tenant root (or *.localhost in dev) are
// treated as tenants, so the marketing/platform domains are never misread.
function tenantSlugFromHost(host: string): string | null {
  const hostname = host.split(":")[0].toLowerCase();
  if (!hostname) return null;
  const root = (process.env.TENANT_ROOT_DOMAIN ?? "mtandaolabsedu.com").toLowerCase();
  const isLocalhost = hostname.endsWith(".localhost");
  const isUnderRoot = hostname.endsWith(`.${root}`);
  if (!isLocalhost && !isUnderRoot) return null;
  const sub = hostname.split(".")[0];
  if (!sub || sub === "localhost" || RESERVED_SUBDOMAINS.has(sub)) return null;
  return sub;
}

export default async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const requestHeaders = new Headers(request.headers);

  // Expose the resolved tenant to server components via a request header.
  const tenantSlug = tenantSlugFromHost(host);
  if (tenantSlug) {
    requestHeaders.set("x-tenant-slug", tenantSlug);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  const path = request.nextUrl.pathname;
  const session = await validSession(request);

  // Tenant resolution + route protection.
  // /admin/* pages and /api/admin/* (except first-time bootstrap) require
  // a verified PLATFORM_ADMIN session.
  if (path.startsWith("/admin")) {
    if (!session || session.userType !== "PLATFORM_ADMIN") {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", path);
      return NextResponse.redirect(login);
    }
  }

  if (
    path.startsWith("/api/admin/") &&
    path !== "/api/admin/bootstrap" &&
    (!session || session.userType !== "PLATFORM_ADMIN")
  ) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (path === "/login" && session) {
    const target =
      session.userType === "PLATFORM_ADMIN"
        ? "/admin/dashboard"
        : session.userType === "PARENT"
          ? "/parent/inbox"
          : "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)"],
};
