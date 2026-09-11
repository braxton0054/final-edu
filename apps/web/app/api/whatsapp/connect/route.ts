import { NextResponse } from "next/server";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { connect } from "@/lib/whatsapp/service";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// POST /api/whatsapp/connect — create (or reuse) this school's Evolution
// instance and return a fresh QR code payload. School is taken from the
// verified session; nothing identifying the tenant comes from the request.
export async function POST(request: Request) {
  const actor = await requireSchoolActor();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: actor.error }, { status: actor.status });
  }

  const rl = await checkRateLimit(`rl:wa:connect:${actor.schoolId}:${clientIp(request)}`, 10, 600);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many connection attempts. Wait a few minutes." },
      { status: 429 }
    );
  }

  const result = await connect(actor.schoolId);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "Could not start WhatsApp connection.", status: result.status },
      { status: 502 }
    );
  }
  // The QR payload is a short-lived data URL; it is returned only to the
  // authenticated school admin, never stored in the database.
  return NextResponse.json({
    ok: true,
    status: result.status,
    qrcode: result.qrcode ?? null,
    pairingCode: result.pairingCode ?? null,
  });
}
