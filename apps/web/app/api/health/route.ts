import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const schools = await prisma.school.count();
    return NextResponse.json({
      status: "ok",
      service: "mtandaolabsedu-web",
      database: "connected",
      schools,
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        service: "mtandaolabsedu-web",
        database: "unreachable",
      },
      { status: 503 }
    );
  }
}
