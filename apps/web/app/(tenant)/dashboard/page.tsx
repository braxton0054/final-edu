import { prisma } from "@mtanda/database";

// Tenant onboarding checklist — completes gradually after registration.
// Resolves the demo school for now; domain-based resolution plugs in here.
export default async function TenantDashboard() {
  const school = await prisma.school.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { students: true, teachers: true, users: true } },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { plan: true },
      },
    },
  });

  if (!school) {
    return (
      <div>
        <h1>School Dashboard</h1>
        <p>No school found.</p>
      </div>
    );
  }

  const emailVerified = await prisma.user.count({
    where: { schoolId: school.id, emailVerified: true },
  });

  const announcements = await prisma.platformAnnouncement.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const items: { label: string; done: boolean }[] = [
    { label: "School profile", done: Boolean(school.county && school.schoolType) },
    { label: "Email verified", done: emailVerified > 0 },
    { label: "Subscription", done: school.subscriptions.length > 0 },
    { label: "Academic structure", done: Boolean((school.levelsOffered as string[] | null)?.length) },
    { label: "Teachers", done: school._count.teachers > 0 },
    { label: "Students", done: school._count.students > 0 },
    { label: "Parents", done: false },
    { label: "Fee structure", done: false },
    { label: "M-Pesa", done: false },
    { label: "Email", done: false },
    { label: "WhatsApp", done: false },
    { label: "Report-card template", done: false },
    { label: "Verification documents", done: false },
  ];
  const complete = items.filter((i) => i.done).length;
  const pct = Math.round((complete / items.length) * 100);

  return (
    <div>
      <h1>Welcome to MtandaoLabsEdu</h1>
      <p>
        {school.name} · School setup: {pct}% complete ({complete}/{items.length})
      </p>
      <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.4rem" }}>
        {items.map((i) => (
          <li key={i.label} style={{ opacity: i.done ? 1 : 0.75 }}>
            {i.done ? "✓" : "□"} {i.label}
          </li>
        ))}
      </ul>
      {announcements.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2>Platform announcements</h2>
          {announcements.map((a) => (
            <div key={a.id} style={{ border: "1px solid #e6e9ee", borderRadius: 10, padding: "0.9rem 1.1rem", marginBottom: "0.75rem" }}>
              <strong>{a.title}</strong>
              <p style={{ margin: "0.35rem 0 0" }}>{a.body}</p>
              <small style={{ color: "#5b6470" }}>{a.createdAt.toDateString()}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
