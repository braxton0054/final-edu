import { NextResponse } from "next/server";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { connect, refreshStatus } from "@/lib/whatsapp/service";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// GET /api/whatsapp/qrcode — fresh QR for the signed-in school. When already
// connected there is nothing to scan, so we return the live status instead.
export async function GET(request: Request) {
  const actor = await requireSchoolActor();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: actor.error }, { status: actor.status });
  }

  const rl = await checkRateLimit(`rl:wa:qr:${actor.schoolId}:${clientIp(request)}`, 12, 600);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many QR requests. Wait a few minutes." },
      { status: 429 }
    );
  }

  const live = await refreshStatus(actor.schoolId);
  if (live.status === "CONNECTED") {
    return NextResponse.json({ ok: true, status: live.status, phoneNumber: live.phoneNumber });
  }

  const result = await connect(actor.schoolId);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "Could not fetch the QR code.", status: result.status },
      { status: 502 }
    );
  }
  return NextResponse.json({
    ok: true,
    status: result.status,
    qrcode: result.qrcode ?? null,
    pairingCode: result.pairingCode ?? null,
  });
}
