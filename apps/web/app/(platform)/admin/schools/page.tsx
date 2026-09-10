import { prisma } from "@mtanda/database";

const STATUSES = ["ALL", "PENDING_VERIFICATION", "TRIAL", "ACTIVE", "SUSPENDED", "ARCHIVED"] as const;

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const status = (statusParam ?? "ALL").toUpperCase();
  const schools = await prisma.school.findMany({
    where: status === "ALL" ? {} : { status: status as never },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { students: true, users: true } },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { plan: true },
      },
    },
  });

  return (
    <>
      <div className="admin-top">
        <h1>Schools</h1>
      </div>
      <div className="admin-body">
        <div className="admin-panel">
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {STATUSES.map((s) => (
              <a
                key={s}
                href={s === "ALL" ? "/admin/schools" : `/admin/schools?status=${s}`}
                className="admin-badge"
                style={
                  status === s
                    ? { background: "#101418", color: "#fff" }
                    : undefined
                }
              >
                {s.replaceAll("_", " ")}
              </a>
            ))}
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>School</th>
                <th>Status</th>
                <th>Plan</th>
                <th>Students</th>
                <th>Domain</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>
                    <span className="admin-badge">{s.status.replaceAll("_", " ")}</span>
                  </td>
                  <td>{s.subscriptions[0]?.plan.name ?? "—"}</td>
                  <td>{s._count.students}</td>
                  <td>{s.subdomain ? `${s.subdomain}.mtandaolabsedu.com` : "—"}</td>
                  <td>
                    <a href={`/admin/schools/${s.id}`}>Open →</a>
                  </td>
                </tr>
              ))}
              {schools.length === 0 && (
                <tr>
                  <td colSpan={6}>No schools in this state.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
