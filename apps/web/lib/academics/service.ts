import { prisma } from "@mtanda/database";
import { teacherScope } from "@/lib/messaging/service";

// ─── Academics: attendance, assessments, scores, reports ───
// Tenant-scoped throughout. Teachers are additionally class-scoped: every
// write path takes an explicit class allow-list for TEACHER callers, and
// finalized assessments are immutable to teachers (staff may reopen).

export const ATTENDANCE = ["present", "absent", "late", "excused"] as const;
export const CBC_LEVELS = ["BE", "AE", "ME", "EE"] as const;
export const ASSESSMENT_TYPES = ["assignment", "quiz", "test", "exam", "cbc"] as const;
export const ASSESSMENT_STATUS = ["draft", "published", "finalized"] as const;

export function isStaff(userType: string): boolean {
  return userType === "SCHOOL_ADMIN" || userType === "STAFF";
}

// Resolve which classes a caller may touch. Staff: every class with students.
// Teachers: assigned classes only (empty when unassigned — never everything).
export async function allowedClasses(
  schoolId: string,
  userId: string,
  userType: string
): Promise<string[]> {
  if (isStaff(userType)) {
    const rows = await prisma.student.findMany({
      where: { schoolId, classId: { not: null } },
      select: { classId: true },
      distinct: ["classId"],
      take: 500,
    });
    return rows.map((r) => r.classId as string).sort();
  }
  if (userType === "TEACHER") {
    const scope = await teacherScope(schoolId, userId);
    return scope?.classIds ?? [];
  }
  return [];
}

export function parseDay(input: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const d = new Date(`${input}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  if (d > new Date()) return null; // no future attendance
  return d;
}

// ─── Attendance ───

export async function getAttendance(schoolId: string, classId: string, day: Date) {
  const students = await prisma.student.findMany({
    where: { schoolId, classId },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  const records = await prisma.attendanceRecord.findMany({
    where: { schoolId, classId, date: day },
  });
  const byStudent = new Map(records.map((r) => [r.studentId, r.status]));
  return students.map((s) => ({
    studentId: s.id,
    admissionNo: s.admissionNo,
    name: [s.firstName, s.lastName].filter(Boolean).join(" ") || "—",
    status: byStudent.get(s.id) ?? null,
  }));
}

export async function saveAttendance(opts: {
  schoolId: string;
  classId: string;
  day: Date;
  markedById: string;
  records: { studentId: string; status: string }[];
}): Promise<{ saved: number }> {
  const students = await prisma.student.findMany({
    where: { schoolId: opts.schoolId, classId: opts.classId },
    select: { id: true },
  });
  const validIds = new Set(students.map((s) => s.id));
  const clean = opts.records.filter(
    (r) => validIds.has(r.studentId) && (ATTENDANCE as readonly string[]).includes(r.status)
  );
  await prisma.$transaction(
    clean.map((r) =>
      prisma.attendanceRecord.upsert({
        where: { studentId_date: { studentId: r.studentId, date: opts.day } },
        update: { status: r.status, markedById: opts.markedById },
        create: {
          schoolId: opts.schoolId,
          studentId: r.studentId,
          classId: opts.classId,
          date: opts.day,
          status: r.status,
          markedById: opts.markedById,
        },
      })
    )
  );
  return { saved: clean.length };
}

export type AttendanceSummary = {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  rate: number | null;
};

export async function attendanceSummary(
  schoolId: string,
  studentId: string
): Promise<AttendanceSummary> {
  const records = await prisma.attendanceRecord.findMany({
    where: { schoolId, studentId },
    select: { status: true },
  });
  const counts: Record<string, number> = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const r of records) {
    if (r.status in counts) counts[r.status]++;
  }
  const total = records.length;
  const rate = total === 0 ? null : Math.round(((counts.present + counts.late) / total) * 100);
  return { ...counts as AttendanceSummary, total, rate };
}

// ─── Assessments ───

export type AssessmentInput = {
  schoolId: string;
  classId: string;
  title: string;
  type: string;
  learningArea?: string;
  term?: string;
  maxScore?: number;
  instructions?: string;
  dueDate?: Date;
  createdById?: string;
};

export async function createAssessment(input: AssessmentInput) {
  if (!input.title.trim()) throw new Error("A title is required.");
  if (!input.classId.trim()) throw new Error("A class is required.");
  if (!(ASSESSMENT_TYPES as readonly string[]).includes(input.type)) {
    throw new Error("Unknown assessment type.");
  }
  return prisma.assessment.create({
    data: {
      schoolId: input.schoolId,
      classId: input.classId.trim(),
      title: input.title.trim().slice(0, 200),
      type: input.type,
      learningArea: input.learningArea?.trim() || null,
      term: input.term?.trim() || null,
      maxScore:
        input.maxScore !== undefined && Number.isFinite(input.maxScore) && input.maxScore > 0
          ? input.maxScore
          : null,
      instructions: input.instructions?.trim().slice(0, 4000) || null,
      dueDate: input.dueDate ?? null,
      status: "draft",
      createdById: input.createdById ?? null,
    },
  });
}

export async function getAssessment(schoolId: string, id: string) {
  return prisma.assessment.findFirst({
    where: { id, schoolId },
    include: {
      scores: {
        include: { student: { select: { admissionNo: true, firstName: true, lastName: true } } },
        orderBy: { student: { admissionNo: "asc" } },
      },
    },
  });
}

export async function listAssessments(
  schoolId: string,
  opts: { classId?: string; type?: string; status?: string } = {}
) {
  return prisma.assessment.findMany({
    where: {
      schoolId,
      ...(opts.classId ? { classId: opts.classId } : {}),
      ...(opts.type ? { type: opts.type } : {}),
      ...(opts.status ? { status: opts.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { _count: { select: { scores: true } } },
  });
}

// Only staff or the class scope may touch an assessment; finalized locks
// teachers out (staff reopen explicitly).
export async function assertAssessmentWritable(opts: {
  schoolId: string;
  userId: string;
  userType: string;
  assessmentId: string;
  allowFinalizedForStaff?: boolean;
}) {
  const assessment = await prisma.assessment.findFirst({
    where: { id: opts.assessmentId, schoolId: opts.schoolId },
  });
  if (!assessment) throw new Error("Assessment not found.");
  if (!isStaff(opts.userType)) {
    const scope = await teacherScope(opts.schoolId, opts.userId);
    if (!scope || !scope.classIds.includes(assessment.classId)) {
      throw new Error("This assessment is outside your assigned classes.");
    }
    if (assessment.status === "finalized") {
      throw new Error("Finalized results cannot be edited. Ask an administrator to reopen.");
    }
  } else if (assessment.status === "finalized" && !opts.allowFinalizedForStaff) {
    throw new Error("This assessment is finalized. Reopen it first.");
  }
  return assessment;
}

export type ScoreInput = {
  studentId: string;
  score?: number;
  level?: string;
  comment?: string;
  submitted?: boolean;
};

export async function saveScores(opts: {
  schoolId: string;
  assessmentId: string;
  maxScore: number | null;
  scores: ScoreInput[];
}): Promise<{ saved: number }> {
  const assessment = await prisma.assessment.findFirst({
    where: { id: opts.assessmentId, schoolId: opts.schoolId },
    select: { id: true, classId: true },
  });
  if (!assessment) throw new Error("Assessment not found.");
  const roster = await prisma.student.findMany({
    where: { schoolId: opts.schoolId, classId: assessment.classId },
    select: { id: true },
  });
  const validIds = new Set(roster.map((s) => s.id));
  const now = new Date();
  let saved = 0;
  await prisma.$transaction(
    opts.scores
      .filter((s) => validIds.has(s.studentId))
      .map((s) => {
        const score =
          s.score !== undefined && Number.isFinite(s.score) && s.score >= 0
            ? Math.min(s.score, opts.maxScore ?? s.score)
            : null;
        const level =
          s.level && (CBC_LEVELS as readonly string[]).includes(s.level) ? s.level : null;
        return prisma.assessmentScore.upsert({
          where: { assessmentId_studentId: { assessmentId: opts.assessmentId, studentId: s.studentId } },
          update: {
            score,
            level,
            comment: s.comment?.trim().slice(0, 1000) || null,
            submittedAt: s.submitted ? now : undefined,
          },
          create: {
            schoolId: opts.schoolId,
            assessmentId: opts.assessmentId,
            studentId: s.studentId,
            score,
            level,
            comment: s.comment?.trim().slice(0, 1000) || null,
            submittedAt: s.submitted ? now : null,
          },
        });
      })
  );
  saved = opts.scores.filter((s) => validIds.has(s.studentId)).length;
  return { saved };
}

export async function setAssessmentStatus(
  schoolId: string,
  assessmentId: string,
  status: string,
  userType: string
) {
  if (!(ASSESSMENT_STATUS as readonly string[]).includes(status)) {
    throw new Error("Unknown status.");
  }
  if (status === "draft") {
    // Reopening a finalized assessment is a staff-only override.
    const current = await prisma.assessment.findFirst({
      where: { id: assessmentId, schoolId },
      select: { status: true },
    });
    if (current?.status === "finalized" && !isStaff(userType)) {
      throw new Error("Only staff can reopen a finalized assessment.");
    }
  }
  return prisma.assessment.update({
    where: { id: assessmentId },
    data: { status },
  });
}

// ─── Results & report cards (computed, never stored) ───

export type ClassPerformance = {
  assessmentId: string;
  title: string;
  type: string;
  learningArea: string | null;
  maxScore: number | null;
  entries: number;
  average: number | null;
};

export async function classPerformance(
  schoolId: string,
  classId: string,
  opts: { term?: string } = {}
) {
  const assessments = await prisma.assessment.findMany({
    where: {
      schoolId,
      classId,
      status: { in: ["published", "finalized"] },
      ...(opts.term ? { term: opts.term } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: { scores: { select: { score: true } } },
  });
  return assessments.map((a) => {
    const nums = a.scores
      .map((s) => (s.score === null ? null : Number(s.score)))
      .filter((n): n is number => n !== null);
    return {
      assessmentId: a.id,
      title: a.title,
      type: a.type,
      learningArea: a.learningArea,
      maxScore: a.maxScore === null ? null : Number(a.maxScore),
      entries: nums.length,
      average: nums.length ? nums.reduce((x, y) => x + y, 0) / nums.length : null,
    } as ClassPerformance;
  });
}

export async function studentResults(
  schoolId: string,
  studentId: string,
  opts: { term?: string } = {}
) {
  const scores = await prisma.assessmentScore.findMany({
    where: {
      schoolId,
      studentId,
      assessment: {
        status: { in: ["published", "finalized"] },
        ...(opts.term ? { term: opts.term } : {}),
      },
    },
    include: {
      assessment: {
        select: { id: true, title: true, type: true, learningArea: true, maxScore: true, term: true, classId: true },
      },
    },
    orderBy: { assessment: { createdAt: "asc" } },
  });
  return scores.map((s) => ({
    assessmentId: s.assessmentId,
    title: s.assessment.title,
    type: s.assessment.type,
    learningArea: s.assessment.learningArea,
    term: s.assessment.term,
    maxScore: s.assessment.maxScore === null ? null : Number(s.assessment.maxScore),
    score: s.score === null ? null : Number(s.score),
    level: s.level,
    comment: s.comment,
  }));
}

export type ReportCard = {
  student: { admissionNo: string; firstName: string | null; lastName: string | null; classId: string | null };
  term: string | null;
  subjects: {
    learningArea: string;
    average: number | null;
    maxScore: number | null;
    levels: string[];
    entries: number;
  }[];
  overallAverage: number | null;
  attendance: { present: number; absent: number; late: number; excused: number; total: number; rate: number | null };
  assessmentsTaken: number;
};

export async function buildReportCard(
  schoolId: string,
  studentId: string,
  term: string | null
): Promise<ReportCard | null> {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
  });
  if (!student) return null;
  const whereTerm = term ? { term } : {};
  const scores = await prisma.assessmentScore.findMany({
    where: {
      schoolId,
      studentId,
      assessment: { status: { in: ["published", "finalized"] }, ...whereTerm },
    },
    include: { assessment: { select: { learningArea: true, maxScore: true } } },
  });
  const byArea = new Map<string, { scores: number[]; max: number | null; levels: string[] }>();
  for (const s of scores) {
    const area = s.assessment.learningArea || "General";
    const entry = byArea.get(area) ?? { scores: [], max: null, levels: [] };
    if (s.score !== null) entry.scores.push(Number(s.score));
    if (s.assessment.maxScore !== null) entry.max = Number(s.assessment.maxScore);
    if (s.level) entry.levels.push(s.level);
    byArea.set(area, entry);
  }
  const subjects = Array.from(byArea.entries()).map(([learningArea, v]) => ({
    learningArea,
    average: v.scores.length ? v.scores.reduce((x, y) => x + y, 0) / v.scores.length : null,
    maxScore: v.max,
    levels: Array.from(new Set(v.levels)),
    entries: v.scores.length + v.levels.length,
  }));
  const allNums = subjects.flatMap((s) =>
    s.average === null ? [] : [s.average]
  );
  const records = await prisma.attendanceRecord.findMany({
    where: { schoolId, studentId },
    select: { status: true },
  });
  const counts: Record<string, number> = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const r of records) {
    if (r.status in counts) counts[r.status]++;
  }
  const total = records.length;
  return {
    student: {
      admissionNo: student.admissionNo,
      firstName: student.firstName,
      lastName: student.lastName,
      classId: student.classId,
    },
    term,
    subjects,
    overallAverage: allNums.length ? allNums.reduce((x, y) => x + y, 0) / allNums.length : null,
    attendance: {
      ...counts as ReportCard["attendance"],
      total,
      rate: total ? Math.round(((counts.present + counts.late) / total) * 100) : null,
    },
    assessmentsTaken: scores.length,
  };
}

// Assessments with missing scores in given classes (teacher "needs marking").
export async function pendingMarking(schoolId: string, classIds: string[]) {
  if (classIds.length === 0) return [];
  const assessments = await prisma.assessment.findMany({
    where: { schoolId, classId: { in: classIds }, status: { in: ["draft", "published"] } },
    select: { id: true, title: true, classId: true },
    take: 50,
  });
  const out: { id: string; title: string; classId: string; missing: number }[] = [];
  for (const a of assessments) {
    const [roster, scored] = await Promise.all([
      prisma.student.count({ where: { schoolId, classId: a.classId } }),
      prisma.assessmentScore.count({ where: { assessmentId: a.id } }),
    ]);
    if (scored < roster) out.push({ ...a, missing: roster - scored });
  }
  return out;
}
