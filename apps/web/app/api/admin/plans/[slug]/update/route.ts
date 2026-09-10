import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { adminActor } from "@/lib/auth/admin-actor";

const base = () =>
  new URL("/admin/plans", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

function num(value: FormDataEntryValue | null, fallback: number): number {
  if (value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// Update a plan's pricing and limits (Super Admin only — add session check before production).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const plan = await prisma.subscriptionPlan.findUnique({ where: { slug } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.redirect(base(), 303);

  const minStudents = Math.floor(num(form.get("minStudents"), plan.minStudents));
  const maxRaw = form.get("maxStudents");
  const maxStudents =
    maxRaw === null || maxRaw === "" ? null : Math.floor(Math.max(0, Number(maxRaw)));
  if (!Number.isFinite(minStudents) || (maxStudents !== null && !Number.isFinite(maxStudents))) {
    return NextResponse.redirect(base(), 303);
  }

  await prisma.subscriptionPlan.update({
    where: { slug },
    data: {
      quarterlyPrice: num(form.get("quarterlyPrice"), Number(plan.quarterlyPrice)),
      minStudents,
      maxStudents:
        maxStudents === null || maxStudents >= minStudents ? maxStudents : minStudents,
      graceStudents: Math.floor(num(form.get("graceStudents"), plan.graceStudents)),
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: await adminActor(),
      action: "platform.plan_updated",
      metadata: { slug },
    },
  });

  return NextResponse.redirect(base(), 303);
}
