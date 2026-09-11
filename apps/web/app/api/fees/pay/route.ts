import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { requireParentActor } from "@/lib/auth/tenant-actor";
import { getSchoolDarajaConfig } from "@/lib/payments/school-daraja";
import { darajaStkPush, toMsisdn } from "@/lib/payments/daraja";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// GET /api/fees/pay — whether online M-Pesa payment is available to parents.
export async function GET() {
  const parent = await requireParentActor();
  if (!parent.ok) {
    return NextResponse.json({ ok: false, error: parent.error }, { status: parent.status });
  }
  const cfg = await getSchoolDarajaConfig(parent.schoolId);
  return NextResponse.json({ ok: true, mpesa: Boolean(cfg && cfg.callbackUrl) });
}

// POST /api/fees/pay — parent pays a child's fees via the SCHOOL's M-Pesa.
// Ownership is proven through the guardian link, never request claims.
export async function POST(request: Request) {
  const parent = await requireParentActor();
  if (!parent.ok) {
    return NextResponse.json({ ok: false, error: parent.error }, { status: parent.status });
  }

  const rl = await checkRateLimit(`rl:feepay:${parent.schoolId}:${parent.userId}`, 5, 600);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many payment attempts. Wait a few minutes." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const studentId = String(body.studentId ?? "");
  const amount = Math.floor(Number(body.amount ?? 0));
  const phone = toMsisdn(String(body.phone ?? ""));
  if (!studentId || !Number.isFinite(amount) || amount < 10 || phone.length < 12) {
    return NextResponse.json(
      { ok: false, error: "Student, an amount of at least KSh 10, and a valid phone number are required." },
      { status: 400 }
    );
  }

  // Ownership: this parent must be linked to this student in this school.
  const link = await prisma.studentGuardian.findFirst({
    where: { schoolId: parent.schoolId, studentId, parentId: parent.userId },
    include: { student: { select: { firstName: true, lastName: true } } },
  });
  if (!link) {
    return NextResponse.json({ ok: false, error: "This student is not linked to your account." }, { status: 403 });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { schoolId: parent.schoolId, studentId, status: { notIn: ["PAID", "CANCELLED"] } },
    orderBy: { createdAt: "asc" },
  });
  const outstanding = invoice ? Number(invoice.balance) : 0;
  if (!invoice || outstanding <= 0) {
    return NextResponse.json({ ok: false, error: "No outstanding balance for this student." }, { status: 400 });
  }
  if (amount > Math.ceil(outstanding)) {
    return NextResponse.json(
      { ok: false, error: `Amount exceeds the ${outstanding.toLocaleString()} balance.` },
      { status: 400 }
    );
  }

  const [cfg, school] = await Promise.all([
    getSchoolDarajaConfig(parent.schoolId),
    prisma.school.findUnique({ where: { id: parent.schoolId } }),
  ]);
  if (!cfg || !school) {
    return NextResponse.json(
      { ok: false, error: "Online payment is not enabled by the school yet." },
      { status: 503 }
    );
  }
  if (!cfg.callbackUrl) {
    return NextResponse.json(
      { ok: false, error: "The school has not finished its payment setup yet." },
      { status: 503 }
    );
  }

  try {
    const push = await darajaStkPush(cfg, {
      phone,
      amount,
      accountRef: school.slug.slice(0, 12),
      description: `Fees ${link.student.firstName ?? ""}`.slice(0, 13),
    });
    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          schoolId: parent.schoolId,
          studentId,
          invoiceId: invoice.id,
          amount,
          method: "MPESA",
          status: "PENDING",
          externalRef: push.checkoutRequestId,
        },
      });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: "SENT" },
      });
      await tx.auditLog.create({
        data: {
          schoolId: parent.schoolId,
          actorId: parent.userId,
          action: "fees.stk_push_sent",
          metadata: { phone: `***${phone.slice(-3)}`, amount },
        },
      });
      return created;
    });
    return NextResponse.json({ ok: true, paymentId: payment.id }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "STK push failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
