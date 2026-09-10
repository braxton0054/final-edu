import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";

type CallbackItem = { Name: string; Value: string | number };

// Daraja STK result callback → confirms the subscription payment.
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

  const payment = await prisma.platformPayment.findUnique({
    where: { externalRef: cb.CheckoutRequestID },
    include: { invoice: { include: { subscription: true } } },
  });
  if (!payment) return NextResponse.json({ ok: true }); // unknown ref, ack anyway

  if (cb.ResultCode === 0) {
    const items = cb.CallbackMetadata?.Item ?? [];
    const receipt = items.find((i) => i.Name === "MpesaReceiptNumber")?.Value;
    await prisma.$transaction([
      prisma.platformPayment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          mpesaReceipt: receipt ? String(receipt) : undefined,
        },
      }),
      ...(payment.invoiceId
        ? [
            prisma.platformInvoice.update({
              where: { id: payment.invoiceId },
              data: { status: "PAID" },
            }),
          ]
        : []),
      ...(payment.invoice?.subscriptionId
        ? [
            prisma.subscription.update({
              where: { id: payment.invoice.subscriptionId },
              data: { status: "ACTIVE" },
            }),
          ]
        : []),
      prisma.auditLog.create({
        data: {
          schoolId: payment.schoolId,
          action: "platform.payment_completed",
          metadata: { provider: "daraja", receipt: receipt ?? null },
        },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.platformPayment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      }),
      prisma.auditLog.create({
        data: {
          schoolId: payment.schoolId,
          action: "platform.payment_failed",
          metadata: { provider: "daraja", reason: cb.ResultDesc ?? null },
        },
      }),
    ]);
  }
  return NextResponse.json({ ok: true });
}
