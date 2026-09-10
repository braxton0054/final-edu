import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { adminActor } from "@/lib/auth/admin-actor";

// Toggle a plan on/off (Super Admin only — add session check before production).
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { slug },
  });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.subscriptionPlan.update({
    where: { slug },
    data: { active: !plan.active },
  });
  await prisma.auditLog.create({
    data: {
      actorId: await adminActor(),
      action: `platform.plan_${plan.active ? "disabled" : "enabled"}`,
      metadata: { slug },
    },
  });
  return NextResponse.redirect(new URL("/admin/plans", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"), 303);
}
