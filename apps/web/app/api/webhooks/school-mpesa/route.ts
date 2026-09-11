import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { notify } from "@/lib/notifications";

type CallbackItem = { Name: string; Value: string | number };

// Daraja STK result callback for SCHOOL fee payments. The tenant is resolved
// strictly via CheckoutRequestID → payment row — the payload carries no
// school identity and none is trusted.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const cb = body?.Body?.stkCallback as
    | {
        CheckoutRequestID?: string;
        ResultCode?: number;
        ResultDesc?: string;
        CallbackMetadata?: { Item?: CallbackItem[] };
      }
    | undefined;
  if (!cb?.CheckoutRequestID) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { externalRef: cb.CheckoutRequestID },
    include: { student: true },
  });
  if (!payment) return NextResponse.json({ ok: true }); // unknown ref, ack anyway
  if (payment.status !== "PENDING") return NextResponse.json({ ok: true }); // idempotent

  if (cb.ResultCode === 0) {
    const items = cb.CallbackMetadata?.Item ?? [];
    const receipt = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value;
    const amount = Number(payment.amount);

    const invoice = payment.invoiceId
      ? await prisma.invoice.findUnique({ where: { id: payment.invoiceId } })
      : null;
    const newBalance = invoice ? Number(invoice.balance) - amount : 0;

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "COMPLETED", mpesaReceipt: receipt ? String(receipt) : undefined },
      }),
      ...(invoice
        ? [
            prisma.invoice.update({
              where: { id: invoice.id },
              data: {
                balance: newBalance,
                status: newBalance <= 0 ? "PAID" : "PARTIALLY_PAID",
              },
            }),
          ]
        : []),
      prisma.auditLog.create({
        data: {
          schoolId: payment.schoolId,
          action: "fees.payment_completed",
          metadata: { receipt: receipt ? String(receipt) : null, amount },
        },
      }),
    ]);

    // Tell the parent in their inbox (best effort, never fails the callback).
    const guardian = await prisma.studentGuardian.findFirst({
      where: { schoolId: payment.schoolId, studentId: payment.studentId, parentId: { not: null } },
    });
    if (guardian?.parentId) {
      await notify({
        schoolId: payment.schoolId,
        event: "payment_confirmation",
        parentUserId: guardian.parentId,
        data: {
          amount: amount.toLocaleString(),
          receipt: receipt ? String(receipt) : undefined,
          student: [payment.student.firstName, payment.student.lastName].filter(Boolean).join(" ") || undefined,
        },
      }).catch(() => null);
    }
  } else {
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      }),
      prisma.auditLog.create({
        data: {
          schoolId: payment.schoolId,
          action: "fees.payment_failed",
          metadata: { reason: cb.ResultDesc ?? null },
        },
      }),
    ]);
  }
  return NextResponse.json({ ok: true });
}
