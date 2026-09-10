import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { adminActor } from "@/lib/auth/admin-actor";

// Publish a platform → tenant broadcast.
export async function POST(request: Request) {
  const actor = await adminActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const title = String(form?.get("title") ?? "").trim();
  const body = String(form?.get("body") ?? "").trim();
  if (!title || !body) {
    return NextResponse.json({ error: "Title and body required." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.platformAnnouncement.create({
      data: { title, body, publishedBy: actor },
    }),
    prisma.auditLog.create({
      data: { actorId: actor, action: "platform.announcement_published", metadata: { title } },
    }),
  ]);

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.redirect(new URL("/admin/announcements", base), 303);
}
