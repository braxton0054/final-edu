import { cookies } from "next/headers";
import { readSessionToken, SESSION_COOKIE, type Session } from "@/lib/auth/session";

// Tenant-side actor resolution for API routes and pages.
// The school identity always comes from the verified session cookie — never
// from query params, request bodies, or headers supplied by the browser.

export async function tenantSession(): Promise<Session | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

export type SchoolActor =
  | { ok: true; schoolId: string; userId: string; email: string; userType: string }
  | { ok: false; status: 401 | 403; error: string };

// Requires a signed-in school user (admin or staff) with a tenant attached.
// PLATFORM_ADMIN accounts carry no schoolId and are rejected here; they use
// the /api/admin/* surface instead.
export async function requireSchoolActor(): Promise<SchoolActor> {
  const session = await tenantSession();
  if (!session) {
    return { ok: false, status: 401, error: "Sign in to continue." };
  }
  if (!session.schoolId) {
    return { ok: false, status: 403, error: "No school is attached to this account." };
  }
  if (session.userType !== "SCHOOL_ADMIN" && session.userType !== "STAFF") {
    return { ok: false, status: 403, error: "Insufficient permissions." };
  }
  return {
    ok: true,
    schoolId: session.schoolId,
    userId: session.userId,
    email: session.email,
    userType: session.userType,
  };
}