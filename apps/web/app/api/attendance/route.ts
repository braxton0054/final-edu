import { NextResponse } from "next/server";
import { requireSchoolUser } from "@/lib/auth/tenant-actor";
import { allowedClasses, getAttendance, parseDay, saveAttendance } from "@/lib/academics/service";
import { isStaff } from "@/lib/academics/service";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// GET /api/attendance?classId=&date=YYYY-MM-DD — roster with that day's marks.
export async function GET(request: Request) {
  const actor = await requireSchoolUser();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: actor.error }, { status: actor.status });
  }
  if (actor.userType !== "SCHOOL_ADMIN" && actor.userType !== "STAFF" && actor.userType !== "TEACHER") {
    return NextResponse.json({ ok: false, error: "Insufficient permissions." }, { status: 403 });
  }
  const params = new URL(request.url).searchParams;
  const classId = params.get("classId") ?? "";
  const day = parseDay(params.get("date") ?? "");
  if (!classId || !day) {
    return NextResponse.json({ ok: false, error: "classId and a valid past date (YYYY-MM-DD) are required." }, { status: 400 });
  }
  const allowed = await allowedClasses(actor.schoolId, actor.userId, actor.userType);
  if (!allowed.includes(classId)) {
    return NextResponse.json({ ok: false, error: "This class is not assigned to you." }, { status: 403 });
  }
  const roster = await getAttendance(actor.schoolId, classId, day);
  return NextResponse.json({ ok: true, roster, isStaff: isStaff(actor.userType) });
}

// POST /api/attendance — save a day's marks (upsert per student).
export async function POST(request: Request) {
  const actor = await requireSchoolUser();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: actor.error }, { status: actor.status });
  }
  if (actor.userType !== "SCHOOL_ADMIN" && actor.userType !== "STAFF" && actor.userType !== "TEACHER") {
    return NextResponse.json({ ok: false, error: "Insufficient permissions." }, { status: 403 });
  }

  const rl = await checkRateLimit(`rl:att:${actor.schoolId}:${actor.userId}`, 60, 3600);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Too many saves. Slow down." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const classId = String(body.classId ?? "");
  const day = parseDay(String(body.date ?? ""));
  if (!classId || !day) {
    return NextResponse.json({ ok: false, error: "classId and a valid past date are required." }, { status: 400 });
  }
  const allowed = await allowedClasses(actor.schoolId, actor.userId, actor.userType);
  if (!allowed.includes(classId)) {
    return NextResponse.json({ ok: false, error: "This class is not assigned to you." }, { status: 403 });
  }
  const records = Array.isArray(body.records) ? body.records : [];
  const out = await saveAttendance({
    schoolId: actor.schoolId,
    classId,
    day,
    markedById: actor.userId,
    records: records.map((r: { studentId?: string; status?: string }) => ({
      studentId: String(r.studentId ?? ""),
      status: String(r.status ?? ""),
    })),
  });
  return NextResponse.json({ ok: true, ...out });
}
