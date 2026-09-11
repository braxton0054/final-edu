import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { requireSchoolUser } from "@/lib/auth/tenant-actor";
import {
  assertAssessmentWritable,
  getAssessment,
  isStaff,
  setAssessmentStatus,
} from "@/lib/academics/service";

// GET /api/assessments/[id] — detail with scores (scope-checked).
export async function GET(
  _request: Request,
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
  try {
    await assertAssessmentWritable({
      schoolId: actor.schoolId,
      userId: actor.userId,
      userType: actor.userType,
      assessmentId: id,
      allowFinalizedForStaff: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Not found.";
    const code = msg.includes("outside your assigned") ? 403 : 404;
    // Finalized is still viewable — only writing is locked.
    if (!msg.includes("Finalized results")) {
      return NextResponse.json({ ok: false, error: msg }, { status: code });
    }
  }
  const assessment = await getAssessment(actor.schoolId, id);
  if (!assessment) {
    return NextResponse.json({ ok: false, error: "Assessment not found." }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    assessment: {
      ...assessment,
      maxScore: assessment.maxScore === null ? null : Number(assessment.maxScore),
      scores: assessment.scores.map((s) => ({
        ...s,
        score: s.score === null ? null : Number(s.score),
      })),
    },
    isStaff: isStaff(actor.userType),
  });
}

// PATCH /api/assessments/[id] — update status (publish/finalize/reopen) or fields.
export async function PATCH(
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
  const body = await request.json().catch(() => ({}));
  try {
    await assertAssessmentWritable({
      schoolId: actor.schoolId,
      userId: actor.userId,
      userType: actor.userType,
      assessmentId: id,
      allowFinalizedForStaff: true,
    });
    if (body.status) {
      await setAssessmentStatus(actor.schoolId, id, String(body.status), actor.userType);
    }
    // Field edits (title/instructions/dueDate) go through the same lock.
    const patch: Record<string, unknown> = {};
    if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim().slice(0, 200);
    if (typeof body.instructions === "string") patch.instructions = body.instructions.trim().slice(0, 4000) || null;
    if (typeof body.dueDate === "string") {
      patch.dueDate = /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate) ? new Date(`${body.dueDate}T00:00:00Z`) : null;
    }
    if (Object.keys(patch).length > 0) {
      await prisma.assessment.update({ where: { id }, data: patch });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Could not update." },
      { status: 400 }
    );
  }
}
