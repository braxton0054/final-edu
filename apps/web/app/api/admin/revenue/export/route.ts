import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { adminActor } from "@/lib/auth/admin-actor";

// CSV export of platform subscription payments.
export async function GET() {
  const actor = await adminActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const rows = await prisma.platformPayment.findMany({
    orderBy: { createdAt: "asc" },
    include: { school: { select: { name: true } } },
  });
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    "date,school,amount,method,status,provider,receipt",
    ...rows.map((p) =>
      [
        p.createdAt.toISOString(),
        esc(p.school.name),
        Number(p.amount),
        p.method,
        p.status,
        p.provider ?? "",
        p.mpesaReceipt ?? "",
      ].join(",")
    ),
  ].join("\n");

  await prisma.auditLog.create({
    data: { actorId: actor, action: "platform.revenue_exported", metadata: { rows: rows.length } },
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=platform-revenue.csv",
    },
  });
}
