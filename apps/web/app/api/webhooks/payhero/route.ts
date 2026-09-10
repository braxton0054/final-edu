import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";

// PayHero payment-status callback → confirms the subscription payment.
// Matches on our stored reference (PayHero reference or CheckoutRequestID).
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const ref =
    (body.reference as string | undefined) ??
    (body.external_reference as string | undefined) ??
    ((body.data as Record<string, unknown> | undefined)?.reference as string | undefined);
  const statusRaw = String(
    body.status ?? (body.data as Record<string, unknown> | undefined)?.status ?? ""
  ).toUpperCase();
  if (!ref) return NextResponse.json({ ok: false }, { status: 400 });

  const payment = await prisma.platformPayment.findFirst({
    where: { OR: [{ externalRef: ref }] },
    include: { invoice: { include: { subscription: true } } },
  });
  // PayHero may echo our external_reference instead of its own reference.
  const matched =
    payment ??
    (await prisma.platformPayment.findFirst({
      where: { externalRef: String(body.external_reference ?? "") },
      include: { invoice: { include: { subscription: true } } },
    }));
  if (!matched) return NextResponse.json({ ok: true }); // unknown ref, ack anyway

  const success = ["SUCCESS", "COMPLETED", "PAID", "SUCCESSFUL"].includes(statusRaw);
  if (success) {
    await prisma.$transaction([
      prisma.platformPayment.update({
        where: { id: matched.id },
        data: {
          status: "COMPLETED",
          mpesaReceipt:
            (body.mpesa_receipt as string | undefined) ??
            (body.MpesaReceiptNumber as string | undefined) ??
            undefined,
        },
      }),
      ...(matched.invoiceId
        ? [prisma.platformInvoice.update({ where: { id: matched.invoiceId }, data: { status: "PAID" } })]
        : []),
      ...(matched.invoice?.subscriptionId
        ? [
            prisma.subscription.update({
              where: { id: matched.invoice.subscriptionId },
              data: { status: "ACTIVE" },
            }),
          ]
        : []),
      prisma.auditLog.create({
        data: {
          schoolId: matched.schoolId,
          action: "platform.payment_completed",
          metadata: { provider: "payhero" },
        },
      }),
    ]);
  } else if (statusRaw.includes("FAIL") || statusRaw.includes("CANCEL")) {
    await prisma.$transaction([
      prisma.platformPayment.update({ where: { id: matched.id }, data: { status: "FAILED" } }),
      prisma.auditLog.create({
        data: {
          schoolId: matched.schoolId,
          action: "platform.payment_failed",
          metadata: { provider: "payhero", reason: statusRaw || null },
        },
      }),
    ]);
  }
  return NextResponse.json({ ok: true });
}
