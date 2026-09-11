import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { darajaToken } from "@/lib/payments/daraja";
import { getSchoolDarajaConfig } from "@/lib/payments/school-daraja";

// POST /api/school-payments/test — live OAuth check with the saved keys.
export async function POST() {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    return NextResponse.json({ ok: false, error: staff.error }, { status: staff.status });
  }
  const cfg = await getSchoolDarajaConfig(staff.schoolId);
  if (!cfg) {
    return NextResponse.json({ ok: false, error: "M-Pesa is not configured." }, { status: 400 });
  }
  try {
    await darajaToken(cfg);
    await prisma.schoolPaymentConfig.update({
      where: { id: cfg.configId },
      data: { lastVerifiedAt: new Date(), lastError: null },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Check failed.";
    await prisma.schoolPaymentConfig.update({
      where: { id: cfg.configId },
      data: { lastError: message.slice(0, 300) },
    });
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
