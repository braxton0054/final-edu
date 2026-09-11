import { NextResponse } from "next/server";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { refreshStatus } from "@/lib/whatsapp/service";

// GET /api/whatsapp/status — live connection status for the signed-in school.
// Probed against Evolution on each call so the dashboard poll sees the truth.
export async function GET() {
  const actor = await requireSchoolActor();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: actor.error }, { status: actor.status });
  }
  const view = await refreshStatus(actor.schoolId);
  return NextResponse.json({ ok: true, ...view });
}
