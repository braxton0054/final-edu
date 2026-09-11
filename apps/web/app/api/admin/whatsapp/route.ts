import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";

// GET /api/admin/whatsapp — platform-wide WhatsApp connection overview.
// Gated to PLATFORM_ADMIN by proxy.ts. Returns operational status only;
// per-instance tokens and message bodies are never included.
export async function GET() {
  const connections = await prisma.whatsAppConnection.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      school: { select: { id: true, name: true, slug: true, status: true } },
      _count: { select: { messages: true } },
    },
    take: 200,
  });

  return NextResponse.json({
    ok: true,
    connections: connections.map((c) => ({
      id: c.id,
      schoolId: c.schoolId,
      schoolName: c.school.name,
      schoolSlug: c.school.slug,
      schoolStatus: c.school.status,
      instanceName: c.instanceName,
      status: c.status,
      phoneNumber: c.phoneNumber,
      lastError: c.lastError,
      connectedAt: c.connectedAt,
      updatedAt: c.updatedAt,
      messageCount: c._count.messages,
    })),
  });
}
