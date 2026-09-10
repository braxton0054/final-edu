import { prisma } from "./client";
import type { Prisma } from "@prisma/client";

export async function runInTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn);
}
