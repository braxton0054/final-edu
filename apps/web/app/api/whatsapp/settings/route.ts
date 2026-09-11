import { NextResponse } from "next/server";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { updateSettings, getStatus, audit } from "@/lib/whatsapp/service";

// GET /api/whatsapp/settings — the signed-in school's notification toggles.
export async function GET() {
  const actor = await requireSchoolActor();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: actor.error }, { status: actor.status });
  }
  const view = await getStatus(actor.schoolId);
  return NextResponse.json({ ok: true, settings: view.settings });
}

const FLAGS = ["notifyFees", "notifyPayments", "notifyResults", "notifyAnnouncements"] as const;

// PATCH /api/whatsapp/settings — flip which notification types WhatsApp sends.
export async function PATCH(request: Request) {
  const actor = await requireSchoolActor();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: actor.error }, { status: actor.status });
  }
  const body = await request.json().catch(() => ({}));
  const patch: Record<string, boolean> = {};
  for (const key of FLAGS) {
    if (typeof body[key] === "boolean") patch[key] = body[key];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "No notification flags provided." }, { status: 400 });
  }
  const view = await updateSettings(actor.schoolId, patch);
  await audit(actor.schoolId, "whatsapp.settings_updated", patch);
  return NextResponse.json({ ok: true, settings: view.settings });
}
