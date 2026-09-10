import { cookies } from "next/headers";
import { readSessionToken } from "@/lib/auth/session";

// Verified platform-admin actor for audit attribution. Null when absent.
export async function adminActor(): Promise<string | null> {
  const store = await cookies();
  const session = readSessionToken(store.get("mtanda_session")?.value);
  if (!session || session.userType !== "PLATFORM_ADMIN") return null;
  return session.userId;
}
