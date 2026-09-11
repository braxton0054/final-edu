import { NextResponse } from "next/server";
import { requireSchoolUser } from "@/lib/auth/tenant-actor";
import { assertAssessmentWritable, getAssessment, saveScores } from "@/lib/academics/service";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// POST /api/assessments/[id]/scores — bulk upsert (spreadsheet save).
// Finalized assessments reject teachers; staff reopen first.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireSchoolUser();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: actor.error }, { status: actor.status });
  }
  if (actor.userType !== "SCHOOL_ADMIN" && actor.userType !== "STAFF" && actor.userType !== "TEACHER") {
    return NextResponse.json({ ok: false, error: "Insufficient permissions." }, { status: 403 });
  }
  const { id } = await params;

  const rl = await checkRateLimit(`rl:scores:${actor.schoolId}:${actor.userId}`, 60, 3600);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Too many saves. Slow down." }, { status: 429 });
  }

  try {
    await assertAssessmentWritable({
      schoolId: actor.schoolId,
      userId: actor.userId,
      userType: actor.userType,
      assessmentId: id,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Cannot edit." },
      { status: 400 }
    );
  }

  const assessment = await getAssessment(actor.schoolId, id);
  if (!assessment) {
    return NextResponse.json({ ok: false, error: "Assessment not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const scores = Array.isArray(body.scores) ? body.scores : [];
  const out = await saveScores({
    schoolId: actor.schoolId,
    assessmentId: id,
    maxScore: assessment.maxScore === null ? null : Number(assessment.maxScore),
    scores: scores.map(
      (s: { studentId?: string; score?: unknown; level?: unknown; comment?: unknown; submitted?: unknown }) => ({
        studentId: String(s.studentId ?? ""),
        score: s.score === "" || s.score === null || s.score === undefined ? undefined : Number(s.score),
        level: typeof s.level === "string" && s.level ? s.level : undefined,
        comment: typeof s.comment === "string" ? s.comment : undefined,
        submitted: s.submitted === true,
      })
    ),
  });
  return NextResponse.json({ ok: true, ...out });
}
