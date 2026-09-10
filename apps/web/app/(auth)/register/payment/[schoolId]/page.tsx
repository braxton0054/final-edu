import { notFound } from "next/navigation";
import { prisma } from "@mtanda/database";
import StkForm from "./StkForm";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { plan: true, invoices: { orderBy: { createdAt: "desc" }, take: 1 } },
      },
    },
  });
  if (!school) notFound();

  const sub = school.subscriptions[0] ?? null;
  const invoice = sub?.invoices[0] ?? null;
  const amount = invoice ? Number(invoice.amount) : 0;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 1.25rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Subscription payment</h1>
      <p>
        <strong>{school.name}</strong> · {sub?.plan.name ?? "—"} plan ·
        Status: <strong>{school.status.replaceAll("_", " ")}</strong>
      </p>
      {amount > 0 ? (
        <>
          <p>First quarter due: <strong>KSh {amount.toLocaleString()}</strong> (14-day trial included).</p>
          <StkForm schoolId={school.id} amount={amount} />
        </>
      ) : (
        <p>Custom plan — our team will contact you with payment details.</p>
      )}
      <p style={{ marginTop: "2rem" }}><small>Email verified? If not, <a href="/login">log in</a> after verifying to continue onboarding.</small></p>
    </div>
  );
}
