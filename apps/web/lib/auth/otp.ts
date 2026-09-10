import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@mtanda/database";

const CODE_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;

function hash(code: string, email: string): string {
  return createHash("sha256").update(`${email}:${code}`).digest("hex");
}

// Issue a 6-digit OTP. Only the hash is stored; the code itself must be
// emailed to the user (returns it so the mail job can send it).
export async function issueOtp(
  email: string,
  purpose: string = "verify"
): Promise<{ code: string; expiresAt: Date }> {
  const normalized = email.toLowerCase().trim();
  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000);

  // Invalidate older unconsumed codes for the same purpose.
  await prisma.emailOtp.updateMany({
    where: { email: normalized, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  await prisma.emailOtp.create({
    data: { email: normalized, purpose, codeHash: hash(code, normalized), expiresAt },
  });
  return { code, expiresAt };
}

export async function verifyOtp(
  email: string,
  code: string,
  purpose: string = "verify"
): Promise<boolean> {
  const normalized = email.toLowerCase().trim();
  const record = await prisma.emailOtp.findFirst({
    where: { email: normalized, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!record || record.expiresAt < new Date() || record.attempts >= MAX_ATTEMPTS) {
    return false;
  }
  const expected = Buffer.from(hash(code.trim(), normalized));
  const actual = Buffer.from(record.codeHash);
  const ok =
    expected.length === actual.length && timingSafeEqual(expected, actual);

  await prisma.emailOtp.update({
    where: { id: record.id },
    data: ok
      ? { consumedAt: new Date() }
      : { attempts: { increment: 1 } },
  });
  return ok;
}
