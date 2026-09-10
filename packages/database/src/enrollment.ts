// Enrollment-limit policy (configurable per plan).
//
// count <= maxStudents            → "ok" (Starter: …250 → still Starter)
// max < count <= max + grace      → "warning" (grace period: notify, allow)
// count > max + grace             → "upgrade-required" (block new enrolments)
// maxStudents null (Custom)       → always "ok"

export type EnrollmentState = "ok" | "warning" | "upgrade-required";

export function enrollmentState(
  activeStudents: number,
  maxStudents: number | null,
  graceStudents: number
): { state: EnrollmentState; remaining: number | null } {
  if (maxStudents === null) return { state: "ok", remaining: null };
  if (activeStudents <= maxStudents) {
    return { state: "ok", remaining: maxStudents - activeStudents };
  }
  if (activeStudents <= maxStudents + graceStudents) {
    return { state: "warning", remaining: 0 };
  }
  return { state: "upgrade-required", remaining: 0 };
}

// Illustrative parent-fee maths for the pricing page (not a billing promise).
export function quarterlyEstimate(students: number, parentMonthlyFee: number) {
  const monthly = students * parentMonthlyFee;
  return { monthly, quarterly: monthly * 3 };
}
