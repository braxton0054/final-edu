import { NextResponse } from "next/server";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { notify, type NotificationEvent } from "@/lib/notifications";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// POST /api/whatsapp/send — send one message from the school's number.
// The school is taken from the verified session; to/text come from the body.
export async function POST(request: Request) {
  const actor = await requireSchoolActor();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: actor.error }, { status: actor.status });
  }

  const rl = await checkRateLimit(`rl:wa:send:${actor.schoolId}:${clientIp(request)}`, 30, 60);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Message rate limit reached. Slow down." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const to = String(body.to ?? "").trim();
  const text = String(body.text ?? body.message ?? "").trim();
  const event = (String(body.event ?? "parent_communication") || "parent_communication") as NotificationEvent;
  if (!to || !text) {
    return NextResponse.json(
      { ok: false, error: "Recipient (to) and message (text) are required." },
      { status: 400 }
    );
  }

  const out = await notify({ schoolId: actor.schoolId, event, to, text });
  if (!out.ok) {
    const status = out.skipped ? 409 : 502;
    return NextResponse.json({ ok: false, error: out.error }, { status });
  }
  return NextResponse.json({ ok: true });
}
