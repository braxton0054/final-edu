import { NextResponse } from "next/server";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { disconnect, restart } from "@/lib/whatsapp/service";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// POST /api/whatsapp/disconnect — log the school's WhatsApp session out.
// The Evolution instance is kept so reconnecting later is a fresh scan.
export async function POST(request: Request) {
  const actor = await requireSchoolActor();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: actor.error }, { status: actor.status });
  }

  const rl = await checkRateLimit(`rl:wa:disc:${actor.schoolId}:${clientIp(request)}`, 10, 600);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests. Wait a few minutes." },
      { status: 429 }
    );
  }

  const out = await disconnect(actor.schoolId);
  if (!out.ok) {
    return NextResponse.json({ ok: false, error: out.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, status: "DISCONNECTED" });
}
