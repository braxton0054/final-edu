# Academics + school fee payments

## Academic structure (year → term → grade → stream)

Grades are school-stable (`Grade 6`); streams are the student groups inside a
grade (`6A`, or `East` — schools choose). Learning areas live at school level;
grades carry default areas that every stream inherits, with per-stream
exceptions (offer/remove). `TeachingAssignment` binds teacher + grade + stream
+ area + year + term; `ClassTeacherAssignment` is separate with exactly one
ACTIVE holder per stream (DB partial unique). `Student.classId` mirrors the
stream displayName so existing queries work; `Enrollment` is the permanent
record — moves close the old row and open a new one, never overwrite.

Backfill (`packages/database/prisma/backfill-academics.ts`, idempotent):
parses existing classIds (`Grade 6A` → grade + stream), seeds standard CBC
areas, derives grade defaults from assessment evidence, migrates legacy
assignments, enrolls every student. Legacy `teacher_assignments` drops after.

- Staff UI: Academics → Grades (streams, class teachers, area defaults,
  exceptions), Learning Areas, Teaching Assignments
- `GET/POST /api/academics/grades`, `POST/PATCH /api/academics/streams`,
  `GET/POST/DELETE /api/academics/areas`, `GET/POST /api/academics/grade-areas`,
  `GET/POST/DELETE /api/academics/assignments`,
  `POST/DELETE /api/academics/class-teachers`, `POST /api/academics/enroll`

## Attendance

`AttendanceRecord` (student × day, unique) with statuses
present/absent/late/excused. Teachers mark only assigned classes; staff mark
any class with students. Past dates editable, future dates rejected. Parents
see counts + rate per child; report cards include the summary.

- `GET/POST /api/attendance` (roster + bulk upsert)

## Assessments, assignments, CBC, results

One `Assessment` model covers tests, quizzes, exams, assignments
(`type=assignment` + instructions + due date), and CBC activities
(`type=cbc` + strand detail in the title/instructions + performance level).
`AssessmentScore` holds a numeric score and/or a CBC level (`BE/AE/ME/EE`)
plus comment per learner; drafts collect scores, `published` exposes them to
parents, `finalized` locks teachers out (staff reopen).

- `GET/POST /api/assessments`, `GET/PATCH /api/assessments/[id]`,
  `POST /api/assessments/[id]/scores` (spreadsheet bulk save)
- Teacher UI: Attendance grid, Assessments list + create, spreadsheet mark
  entry, Results (class averages + marking queue)
- Parent UI: Results (published only), Assignments (published + submission
  state), printable Report cards (subject averages, CBC levels, attendance)

Report cards are computed live (`buildReportCard`) and printed to PDF via the
browser — no PDF service needed.

## School M-Pesa fee collection

Each school holds its own Daraja credentials (`SchoolPaymentConfig`,
AES-encrypted), configured on the staff Finance page with a live test.
Parents pay from Fees: the backend creates a PENDING payment, sends the STK
push through the school's rails, and `POST /api/webhooks/school-mpesa`
(Daraja callback, matched by CheckoutRequestID → payment, idempotent)
completes it, decrements the invoice, notifies the parent inbox, and audits.
Tenant resolution never trusts request input.

Not yet built (no models): timetable/today schedule, lesson plans,
curriculum coverage %, file attachments, Excel export, 2FA.
