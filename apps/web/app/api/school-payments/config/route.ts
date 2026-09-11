import { NextResponse } from "next/server";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import {
  getSchoolDarajaSummary,
  saveSchoolDarajaConfig,
} from "@/lib/payments/school-daraja";

// GET /api/school-payments/config — safe summary (staff only, no secrets).
export async function GET() {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    return NextResponse.json({ ok: false, error: staff.error }, { status: staff.status });
  }
  const summary = await getSchoolDarajaSummary(staff.schoolId);
  return NextResponse.json({ ok: true, ...summary });
}

// POST /api/school-payments/config — save the school's Daraja credentials.
export async function POST(request: Request) {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    return NextResponse.json({ ok: false, error: staff.error }, { status: staff.status });
  }
  const body = await request.json().catch(() => ({}));
  try {
    await saveSchoolDarajaConfig({
      schoolId: staff.schoolId,
      environment: String(body.environment ?? "sandbox"),
      consumerKey: String(body.consumerKey ?? ""),
      consumerSecret: String(body.consumerSecret ?? ""),
      shortcode: String(body.shortcode ?? ""),
      passkey: String(body.passkey ?? ""),
      callbackUrl: String(body.callbackUrl ?? ""),
      active: body.active !== false,
      updatedBy: staff.userId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Could not save." },
      { status: 400 }
    );
  }
}
