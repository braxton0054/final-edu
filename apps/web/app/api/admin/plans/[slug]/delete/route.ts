import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { adminActor } from "@/lib/auth/admin-actor";

const base = () =>
  new URL("/admin/plans", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

// Delete a plan. Refused while any subscription uses it.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { slug },
    include: { _count: { select: { subscriptions: true } } },
  });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (plan._count.subscriptions > 0) {
    return NextResponse.json(
      { error: "Plan in use — disable it instead." },
      { status: 409 }
    );
  }
  await prisma.subscriptionPlan.delete({ where: { slug } });
  await prisma.auditLog.create({
    data: { actorId: await adminActor(), action: "platform.plan_deleted", metadata: { slug } },
  });
  return NextResponse.redirect(base(), 303);
}
