import { NextResponse } from "next/server";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { createParent, listParents } from "@/lib/messaging/service";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// GET /api/parents — school admin lists parent accounts with linked children.
export async function GET() {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    return NextResponse.json({ ok: false, error: staff.error }, { status: staff.status });
  }
  const parents = await listParents(staff.schoolId);
  return NextResponse.json({ ok: true, parents });
}

// POST /api/parents — school admin creates a parent login and links children
// by admission number. Unknown admission numbers are ignored (reported back).
export async function POST(request: Request) {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    return NextResponse.json({ ok: false, error: staff.error }, { status: staff.status });
  }

  const rl = await checkRateLimit(`rl:parents:${staff.schoolId}:${clientIp(request)}`, 30, 3600);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many accounts. Try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const admissionRaw = String(body.admissionNos ?? body.students ?? "");
  const studentAdmissionNos = admissionRaw
    .split(/[,;\n]/)
    .map((s: string) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

  try {
    const created = await createParent({
      schoolId: staff.schoolId,
      firstName: String(body.firstName ?? "").trim(),
      lastName: String(body.lastName ?? "").trim(),
      email: String(body.email ?? ""),
      phone: String(body.phone ?? ""),
      password: String(body.password ?? ""),
      studentAdmissionNos,
    });
    return NextResponse.json({ ok: true, ...created }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Could not create parent." },
      { status: 400 }
    );
  }
}
