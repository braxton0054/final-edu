import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { getDarajaConfig, darajaStkPush, toMsisdn } from "@/lib/payments/daraja";
import { getPayHeroConfig, payheroStkPush } from "@/lib/payments/payhero";

// Real STK push for a school's subscription invoice.
// Uses the active provider (Daraja preferred, PayHero fallback) with the
// encrypted platform credentials. The push result + provider reference are
// stored; the provider callback confirms the payment via webhooks.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const schoolId = String(body.schoolId ?? "");
  const phone = String(body.phone ?? "").replace(/\D/g, "");
  if (!schoolId || phone.length < 9) {
    return NextResponse.json(
      { ok: false, error: "School and a valid phone number are required." },
      { status: 400 }
    );
  }

  const [school, invoice] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId } }),
    prisma.platformInvoice.findFirst({
      where: { schoolId, status: { in: ["DRAFT", "SENT"] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!school || !invoice) {
    return NextResponse.json(
      { ok: false, error: "No outstanding subscription invoice." },
      { status: 400 }
    );
  }

  const amount = Number(invoice.amount);
  let provider: string;
  let externalRef: string;

  try {
    const daraja = await getDarajaConfig();
    if (daraja) {
      provider = "daraja";
      const push = await darajaStkPush(daraja, {
        phone,
        amount,
        accountRef: school.slug,
        description: `Sub ${school.slug}`,
      });
      externalRef = push.checkoutRequestId;
    } else {
      const payhero = await getPayHeroConfig();
      if (!payhero) {
        return NextResponse.json(
          { ok: false, error: "No payment provider is configured. Add Daraja or PayHero credentials in Super Admin → Payment Settings." },
          { status: 503 }
        );
      }
      provider = "payhero";
      const push = await payheroStkPush(payhero, {
        phone,
        amount,
        externalRef: `SUB-${invoice.id.slice(-8).toUpperCase()}`,
        customerName: school.name,
      });
      externalRef = push.checkoutRequestId ?? push.reference;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "STK push failed.";
    await prisma.auditLog.create({
      data: { schoolId, action: "platform.stk_push_failed", metadata: { error: message.slice(0, 300) } },
    });
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.platformPayment.create({
      data: {
        schoolId,
        invoiceId: invoice.id,
        amount: invoice.amount,
        method: "MPESA",
        status: "PENDING",
        provider,
        externalRef,
      },
    });
    await tx.platformInvoice.update({
      where: { id: invoice.id },
      data: { status: "SENT" },
    });
    await tx.auditLog.create({
      data: {
        schoolId,
        action: "platform.stk_push_sent",
        metadata: { provider, phone: `***${toMsisdn(phone).slice(-3)}` },
      },
    });
    return created;
  });

  return NextResponse.json({ ok: true, paymentId: payment.id }, { status: 201 });
}
