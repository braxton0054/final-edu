import { NextResponse } from "next/server";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { restart } from "@/lib/whatsapp/service";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// POST /api/whatsapp/reconnect — restart the Evolution instance and get a
// fresh QR (for expired sessions or flaky connections).
export async function POST(request: Request) {
  const actor = await requireSchoolActor();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: actor.error }, { status: actor.status });
  }

  const rl = await checkRateLimit(`rl:wa:reconn:${actor.schoolId}:${clientIp(request)}`, 5, 600);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many reconnect attempts. Wait a few minutes." },
      { status: 429 }
    );
  }

  const result = await restart(actor.schoolId);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "Could not restart WhatsApp.", status: result.status },
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
