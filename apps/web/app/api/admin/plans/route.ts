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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

// Create a new subscription plan.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.redirect(base(), 303);

  const name = String(form.get("name") ?? "").trim();
  const slug = slugify(String(form.get("slug") ?? "") || name);
  if (!name || !slug) return NextResponse.redirect(base(), 303);

  const exists = await prisma.subscriptionPlan.findUnique({ where: { slug } });
  if (exists) return NextResponse.redirect(base(), 303);

  const minStudents = Math.floor(num(form.get("minStudents"), 0));
  const maxRaw = form.get("maxStudents");
  const maxStudents =
    maxRaw === null || maxRaw === "" ? null : Math.floor(Math.max(0, Number(maxRaw)));
  const count = await prisma.subscriptionPlan.count();

  await prisma.subscriptionPlan.create({
    data: {
      name,
      slug,
      quarterlyPrice: num(form.get("quarterlyPrice"), 0),
      minStudents,
      maxStudents: maxStudents === null || maxStudents >= minStudents ? maxStudents : minStudents,
      graceStudents: Math.floor(num(form.get("graceStudents"), 2)),
      trialDays: Math.max(0, Math.floor(num(form.get("trialDays"), 90))),
      features: [],
      active: true,
      displayOrder: count + 1,
    },
  });
  await prisma.auditLog.create({
    data: { actorId: await adminActor(), action: "platform.plan_created", metadata: { slug } },
  });
  return NextResponse.redirect(base(), 303);
}
