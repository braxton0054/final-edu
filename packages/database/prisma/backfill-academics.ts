// One-shot backfill: builds the managed academic structure from existing
// free-text data. Safe to re-run (every step is find-first-or-create).
// Run: pnpm --filter @mtanda/database exec tsx prisma/backfill-academics.ts
import { prisma } from "../src/client";

const STANDARD_AREAS = [
  "Mathematics",
  "English",
  "Kiswahili",
  "Science & Technology",
  "Social Studies",
  "Creative Arts",
  "Agriculture",
  "Religious Education",
  "Physical Education",
];

// "Grade 6A" -> { grade: "Grade 6", stream: "A" }. Anything else becomes a
// single-stream grade keeping the original name as display.
function splitClass(classId: string): { grade: string; stream: string } {
  const m = classId.trim().match(/^(.+?)[\s\-]*([A-Za-z])$/);
  if (m) return { grade: m[1].trim(), stream: m[2].toUpperCase() };
  return { grade: classId.trim(), stream: "A" };
}

async function ensureYearTerm(schoolId: string, yearName: string | null, termName: string | null) {
  const year = await prisma.academicYear.upsert({
    where: { schoolId_name: { schoolId, name: yearName?.trim() || "2026" } },
    update: {},
    create: { schoolId, name: yearName?.trim() || "2026", isCurrent: true },
  });
  const names = ["Term 1", "Term 2", "Term 3"];
  for (const n of names) {
    await prisma.term.upsert({
      where: { academicYearId_name: { academicYearId: year.id, name: n } },
      update: {},
      create: {
        schoolId,
        academicYearId: year.id,
        name: n,
        isCurrent: (termName ?? "").toLowerCase().includes(n.toLowerCase().replace("term ", "")) ||
          (termName === n),
      },
    });
  }
  const current =
    (await prisma.term.findFirst({ where: { academicYearId: year.id, isCurrent: true } })) ??
    (await prisma.term.findFirst({ where: { academicYearId: year.id } }));
  return { year, term: current! };
}

async function main() {
  const schools = await prisma.school.findMany();
  for (const school of schools) {
    console.log(`\n== ${school.slug} ==`);
    const { year, term } = await ensureYearTerm(school.id, school.academicYear, school.currentTerm);
    console.log(`year=${year.name} term=${term?.name}`);

    // Standard learning areas (only when the school has none).
    const areaCount = await prisma.learningArea.count({ where: { schoolId: school.id } });
    if (areaCount === 0) {
      await prisma.learningArea.createMany({
        data: STANDARD_AREAS.map((name) => ({ schoolId: school.id, name })),
      });
      console.log(`seeded ${STANDARD_AREAS.length} learning areas`);
    }
    const areas = await prisma.learningArea.findMany({ where: { schoolId: school.id } });
    const areaByName = new Map(areas.map((a) => [a.name.toLowerCase(), a]));

    // Grades + streams from every classId in use.
    const classRows = await prisma.student.findMany({
      where: { schoolId: school.id, classId: { not: null } },
      select: { classId: true },
      distinct: ["classId"],
    });
    const streamByDisplay = new Map<string, { gradeId: string; streamId: string }>();
    for (const row of classRows) {
      const display = row.classId as string;
      const { grade: gradeName, stream: streamName } = splitClass(display);
      const grade = await prisma.grade.upsert({
        where: { schoolId_name: { schoolId: school.id, name: gradeName } },
        update: {},
        create: { schoolId: school.id, name: gradeName },
      });
      const stream = await prisma.stream.upsert({
        where: { gradeId_name: { gradeId: grade.id, name: streamName } },
        update: {},
        create: { schoolId: school.id, gradeId: grade.id, name: streamName, displayName: display },
      });
      streamByDisplay.set(display, { gradeId: grade.id, streamId: stream.id });
      console.log(`class "${display}" -> grade "${gradeName}" / stream "${streamName}"`);
    }

    // Grade default areas from assessment + assignment evidence.
    const evidence = await prisma.assessment.findMany({
      where: { schoolId: school.id, learningArea: { not: null } },
      select: { classId: true, learningArea: true },
      distinct: ["classId", "learningArea"],
    });
    // Migrate legacy assignments. Raw SQL: the pre-structure table is gone on
    // fresh databases (dropped by migration), so the generated client has no
    // accessor for it.
    type LegacyRow = { teacherId: string; classId: string; learningArea: string | null; role: string };
    let oldAssignments: LegacyRow[] = [];
    try {
      oldAssignments = await prisma.$queryRaw<LegacyRow[]>`
        SELECT "teacherId", "classId", "learningArea", "role"
        FROM "teacher_assignments" WHERE "schoolId" = ${school.id}
      `;
    } catch {
      oldAssignments = [];
    }
    for (const e of evidence) {
      const loc = streamByDisplay.get(e.classId);
      const area = e.learningArea ? areaByName.get(e.learningArea.toLowerCase()) : undefined;
      if (!loc || !area) continue;
      await prisma.gradeLearningArea.upsert({
        where: { gradeId_learningAreaId: { gradeId: loc.gradeId, learningAreaId: area.id } },
        update: {},
        create: { gradeId: loc.gradeId, learningAreaId: area.id },
      });
    }
    for (const a of oldAssignments) {
      const loc = streamByDisplay.get(a.classId);
      const area = a.learningArea ? areaByName.get(a.learningArea.toLowerCase()) : undefined;
      if (loc && area) {
        await prisma.gradeLearningArea.upsert({
          where: { gradeId_learningAreaId: { gradeId: loc.gradeId, learningAreaId: area.id } },
          update: {},
          create: { gradeId: loc.gradeId, learningAreaId: area.id },
        });
      }
    }
    console.log("grade defaults derived from evidence");

    // Migrate old assignments -> TeachingAssignment (+ ClassTeacherAssignment).
    const alreadyMigrated = await prisma.teachingAssignment.count({ where: { schoolId: school.id } });
    if (alreadyMigrated === 0 && oldAssignments.length > 0) {
      for (const a of oldAssignments) {
        const loc = streamByDisplay.get(a.classId);
        if (!loc) continue;
        const area = a.learningArea ? areaByName.get(a.learningArea.toLowerCase()) : undefined;
        if (a.role === "class_teacher") {
          await prisma.classTeacherAssignment.create({
            data: {
              schoolId: school.id, academicYearId: year.id, termId: term?.id ?? null,
              teacherId: a.teacherId, gradeId: loc.gradeId, streamId: loc.streamId, status: "active",
            },
          });
        }
        if (area || a.role !== "class_teacher") {
          await prisma.teachingAssignment.create({
            data: {
              schoolId: school.id, academicYearId: year.id, termId: term?.id ?? null,
              teacherId: a.teacherId, gradeId: loc.gradeId, streamId: loc.streamId,
              learningAreaId: area?.id ?? null, status: "active",
            },
          });
        }
      }
      console.log(`migrated ${oldAssignments.length} legacy assignments`);
    } else {
      console.log(`assignments: ${oldAssignments.length} legacy, ${alreadyMigrated} new (skipped)`);
    }

    // Enrollments for students missing one.
    const students = await prisma.student.findMany({
      where: { schoolId: school.id, classId: { not: null } },
      select: { id: true, classId: true },
    });
    let enrolled = 0;
    for (const s of students) {
      const has = await prisma.enrollment.findFirst({
        where: { studentId: s.id, status: "active" },
      });
      if (has) continue;
      const loc = streamByDisplay.get(s.classId as string);
      if (!loc) continue;
      await prisma.enrollment.create({
        data: {
          schoolId: school.id, studentId: s.id, academicYearId: year.id,
          gradeId: loc.gradeId, streamId: loc.streamId, status: "active",
        },
      });
      enrolled++;
    }
    console.log(`enrolled ${enrolled}/${students.length} students`);
  }
  console.log("\nBACKFILL DONE");
}

main()
  .catch((e) => {
    console.error("BACKFILL FAILED:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
