import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { adminActor } from "@/lib/auth/admin-actor";

// School lifecycle control: suspend (cutoff), reactivate, archive.
// Verification itself stays automatic (email + payment); this is operations.
const ALLOWED = ["ACTIVE", "SUSPENDED", "ARCHIVED", "TRIAL"] as const;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const contentType = request.headers.get("content-type") ?? "";
  let status = "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    status = String(body.status ?? "");
  } else {
    const form = await request.formData().catch(() => null);
    status = String(form?.get("status") ?? "");
  }
  if (!(ALLOWED as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.school.update({ where: { id: schoolId }, data: { status: status as never } }),
    prisma.auditLog.create({
      data: {
        schoolId,
        actorId: await adminActor(),
        action: `school.status_changed_to_${status.toLowerCase()}`,
        metadata: { from: school.status },
      },
    }),
  ]);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (contentType.includes("application/json")) {
    return NextResponse.json({ ok: true, status });
  }
  return NextResponse.redirect(new URL(`/admin/schools/${schoolId}`, base), 303);
}
