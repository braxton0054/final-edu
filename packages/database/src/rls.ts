// RLS helper placeholder: set app.current_tenant for Postgres row-level security.
import { prisma } from "./client";

export async function withTenant<T>(schoolId: string, fn: () => Promise<T>): Promise<T> {
  await prisma.$executeRaw`SELECT set_config('app.current_tenant', ${schoolId}, true)`;
  try {
    return await fn();
  } finally {
    await prisma.$executeRaw`SELECT set_config('app.current_tenant', '', true)`;
  }
}
