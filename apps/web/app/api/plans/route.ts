import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";

// Public: active subscription plans (drives pricing page + signup).
export async function GET() {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: { displayOrder: "asc" },
  });
  return NextResponse.json(
    plans.map((p) => ({
      slug: p.slug,
      name: p.name,
      quarterlyPrice: Number(p.quarterlyPrice),
      minStudents: p.minStudents,
      maxStudents: p.maxStudents,
      features: p.features,
    }))
  );
}
