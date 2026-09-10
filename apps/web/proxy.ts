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

// Fully verifies the HMAC-signed session cookie (not forgeable).
async function validSession(request: NextRequest): Promise<Claim | null> {
  try {
    const token = request.cookies.get("mtanda_session")?.value;
    if (!token) return null;
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const secret = process.env.NEXTAUTH_SECRET ?? "dev-only-insecure-key";
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

export default async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const response = NextResponse.next();
  // e.g. myschool.localhost -> myschool ; skip www / platform domains
  const subdomain = host.split(".")[0];
  if (subdomain && subdomain !== "www" && subdomain !== "localhost:3000") {
    response.headers.set("x-tenant-slug", subdomain);
  }

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
      session.userType === "PLATFORM_ADMIN" ? "/admin/dashboard" : "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)"],
};
