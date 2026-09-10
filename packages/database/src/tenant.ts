import { prisma } from "./client";

// Tenant-scoped helpers: always filter by schoolId to enforce isolation.
export function scopeBySchool<T extends { schoolId?: unknown }>(schoolId: string) {
  return { schoolId } as Partial<T>;
}

export async function getSchoolBySlug(slug: string) {
  return prisma.school.findUnique({ where: { slug } });
}
