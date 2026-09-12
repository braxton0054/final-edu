import { prisma } from "@mtanda/database";

// ─── Managed academic structure ───
// Grades/streams/areas/assignments created by staff. Teacher scope resolves
// here (never from free text). Stream displayNames match the classId
// convention so every existing query keeps working.

export async function ensureYearTerm(schoolId: string) {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  const yearName = school?.academicYear?.trim() || "2026";
  const year = await prisma.academicYear.upsert({
    where: { schoolId_name: { schoolId, name: yearName } },
    update: {},
    create: { schoolId, name: yearName, isCurrent: true },
  });
  const termName = school?.currentTerm?.trim() || "Term 3";
  let term = await prisma.term.findFirst({ where: { academicYearId: year.id, name: termName } });
  if (!term) {
    term = await prisma.term.create({
      data: { schoolId, academicYearId: year.id, name: termName, isCurrent: true },
    });
  }
  return { year, term };
}

// Effective learning areas for a stream: grade defaults overlaid by
// stream-level exceptions (offered=false removes, offered=true adds).
export async function effectiveAreas(streamId: string): Promise<string[]> {
  const stream = await prisma.stream.findUnique({
    where: { id: streamId },
    include: {
      grade: { include: { gradeAreas: { include: { learningArea: true } } } },
      areaOverrides: { include: { learningArea: true } },
    },
  });
  if (!stream) return [];
  const areas = new Map<string, string>();
  for (const g of stream.grade.gradeAreas) areas.set(g.learningAreaId, g.learningArea.name);
  for (const o of stream.areaOverrides) {
    if (o.offered) areas.set(o.learningAreaId, o.learningArea.name);
    else areas.delete(o.learningAreaId);
  }
  return Array.from(areas.values()).sort();
}

export type TeacherClassScope = {
  classId: string; // stream displayName — the join key everywhere
  gradeId: string;
  streamId: string;
  gradeName: string;
  streamName: string;
  learningAreas: string[];
  roles: string[]; // class_teacher and/or subject_teacher
};

export type RichTeacherScope = {
  teacherId: string;
  firstName: string | null;
  lastName: string | null;
  classes: TeacherClassScope[];
  classIds: string[];
  isClassTeacher: boolean;
};

// Full scope from managed assignments (current year). Empty scope when the
// teacher has no active rows — never whole-school fallback.
export async function richTeacherScope(
  schoolId: string,
  userId: string
): Promise<RichTeacherScope | null> {
  const teacher = await prisma.teacher.findFirst({
    where: { schoolId, userId },
  });
  if (!teacher) return null;

  const [teaching, classTeaching] = await Promise.all([
    prisma.teachingAssignment.findMany({
      where: { schoolId, teacherId: teacher.id, status: "active" },
      include: {
        stream: { select: { id: true, displayName: true, name: true } },
        grade: { select: { id: true, name: true } },
        learningArea: { select: { name: true } },
      },
    }),
    prisma.classTeacherAssignment.findMany({
      where: { schoolId, teacherId: teacher.id, status: "active" },
      include: {
        stream: { select: { id: true, displayName: true, name: true } },
        grade: { select: { id: true, name: true } },
      },
    }),
  ]);

  const byStream = new Map<string, TeacherClassScope>();
  for (const t of teaching) {
    const entry = byStream.get(t.streamId) ?? {
      classId: t.stream.displayName,
      gradeId: t.gradeId,
      streamId: t.streamId,
      gradeName: t.grade.name,
      streamName: t.stream.name,
      learningAreas: [],
      roles: ["subject_teacher"],
    };
    if (t.learningArea && !entry.learningAreas.includes(t.learningArea.name)) {
      entry.learningAreas.push(t.learningArea.name);
    }
    byStream.set(t.streamId, entry);
  }
  for (const ct of classTeaching) {
    const entry = byStream.get(ct.streamId) ?? {
      classId: ct.stream.displayName,
      gradeId: ct.gradeId,
      streamId: ct.streamId,
      gradeName: ct.grade.name,
      streamName: ct.stream.name,
      learningAreas: [],
      roles: [],
    };
    if (!entry.roles.includes("class_teacher")) entry.roles.push("class_teacher");
    byStream.set(ct.streamId, entry);
  }

  const classes = Array.from(byStream.values()).sort((a, b) =>
    a.classId.localeCompare(b.classId)
  );
  return {
    teacherId: teacher.id,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    classes,
    classIds: classes.map((c) => c.classId),
    isClassTeacher: classTeaching.length > 0,
  };
}

// Grades with streams + counts for staff management screens.
export async function gradesOverview(schoolId: string) {
  const grades = await prisma.grade.findMany({
    where: { schoolId },
    orderBy: { name: "asc" },
    include: {
      streams: {
        orderBy: { name: "asc" },
        include: {
          _count: { select: { enrollments: true } },
          classTeacherAssignments: {
            where: { status: "active" },
            include: { teacher: { select: { firstName: true, lastName: true } } },
            take: 1,
          },
        },
      },
      _count: { select: { gradeAreas: true } },
    },
  });
  return grades;
}

// Move a student to another stream: closes the old enrollment, opens a new
// one, and mirrors the new displayName onto Student.classId. History kept.
export async function moveStudent(opts: {
  schoolId: string;
  studentId: string;
  streamId: string;
  actorId?: string;
}) {
  const stream = await prisma.stream.findFirst({
    where: { id: opts.streamId, schoolId: opts.schoolId },
    include: { grade: true },
  });
  if (!stream) throw new Error("Stream not found in this school.");
  const student = await prisma.student.findFirst({
    where: { id: opts.studentId, schoolId: opts.schoolId },
  });
  if (!student) throw new Error("Student not found in this school.");
  const { year } = await ensureYearTerm(opts.schoolId);

  await prisma.$transaction(async (tx) => {
    await tx.enrollment.updateMany({
      where: { studentId: opts.studentId, status: "active" },
      data: { status: "completed" },
    });
    await tx.enrollment.create({
      data: {
        schoolId: opts.schoolId,
        studentId: opts.studentId,
        academicYearId: year.id,
        gradeId: stream.gradeId,
        streamId: stream.id,
        status: "active",
      },
    });
    await tx.student.update({
      where: { id: opts.studentId },
      data: { classId: stream.displayName },
    });
    await tx.auditLog.create({
      data: {
        schoolId: opts.schoolId,
        actorId: opts.actorId ?? null,
        action: "academics.student_moved",
        metadata: {
          studentId: opts.studentId,
          from: student.classId ?? null,
          to: stream.displayName,
        },
      },
    });
  });
  return { ok: true as const, classId: stream.displayName };
}
