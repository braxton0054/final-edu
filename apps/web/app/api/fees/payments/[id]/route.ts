import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { requireParentActor } from "@/lib/auth/tenant-actor";

// GET /api/fees/payments/[id] — a parent polls their own STK attempt.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const parent = await requireParentActor();
  if (!parent.ok) {
    return NextResponse.json({ ok: false, error: parent.error }, { status: parent.status });
  }
  const { id } = await params;
  const payment = await prisma.payment.findFirst({
    where: { id, schoolId: parent.schoolId },
    include: { student: { select: { firstName: true, lastName: true } } },
  });
  if (!payment) {
    return NextResponse.json({ ok: false, error: "Payment not found." }, { status: 404 });
  }
  // Ownership: only a linked guardian sees this payment.
  const link = await prisma.studentGuardian.findFirst({
    where: { schoolId: parent.schoolId, studentId: payment.studentId, parentId: parent.userId },
  });
  if (!link) {
    return NextResponse.json({ ok: false, error: "Not your payment." }, { status: 403 });
  }
  return NextResponse.json({
    ok: true,
    status: payment.status,
    amount: Number(payment.amount),
    receipt: payment.mpesaReceipt,
  });
}
