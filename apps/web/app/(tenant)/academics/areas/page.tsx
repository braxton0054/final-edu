import { redirect } from "next/navigation";
import { prisma } from "@mtanda/database";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import AreasClient from "./AreasClient";

export const dynamic = "force-dynamic";

export default async function AreasPage() {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    redirect("/login?next=/academics/areas");
  }
  const areas = await prisma.learningArea.findMany({
    where: { schoolId: staff.schoolId },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="dash-greet">Learning Areas</h1>
      <p className="dash-sub">
        School-level subjects. Assign them to grades from each grade&apos;s page.
      </p>
      <AreasClient initial={areas.map((a) => ({ id: a.id, name: a.name, code: a.code }))} />
    </div>
  );
}
