import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { verifySmtp } from "@/lib/email/mailer";

// Live SMTP check (AUTH + handshake against the real provider).
export async function POST() {
  const result = await verifySmtp();
  await prisma.platformEmailSettings.updateMany({
    where: { active: true },
    data: {
      lastVerifiedAt: result.ok ? new Date() : undefined,
      lastError: result.ok ? null : result.error?.slice(0, 500),
    },
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
