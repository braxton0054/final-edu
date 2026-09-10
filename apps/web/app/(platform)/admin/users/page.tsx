import { prisma } from "@mtanda/database";

const TYPES = ["ALL", "PLATFORM_ADMIN", "SCHOOL_ADMIN", "TEACHER", "PARENT", "STAFF"] as const;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: typeParam } = await searchParams;
  const type = (typeParam ?? "ALL").toUpperCase();
  const users = await prisma.user.findMany({
    where: type === "ALL" ? {} : { userType: type as never },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { school: true },
  });

  return (
    <>
      <div className="admin-top"><h1>Users</h1></div>
      <div className="admin-body">
        <div className="admin-panel">
          <h2>All users ({users.length})</h2>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {TYPES.map((t) => (
              <a
                key={t}
                href={t === "ALL" ? "/admin/users" : `/admin/users?type=${t}`}
                className="admin-badge"
                style={type === t ? { background: "#101418", color: "#fff" } : undefined}
              >
                {t.replaceAll("_", " ")}
              </a>
            ))}
          </div>
          <table className="admin-table">
            <thead><tr><th>Email</th><th>Type</th><th>School</th><th>Verified</th><th>Joined</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td><span className="admin-badge">{u.userType.replaceAll("_", " ")}</span></td>
                  <td>{u.school ? <a href={`/admin/schools/${u.schoolId}`}>{u.school.name}</a> : "— platform —"}</td>
                  <td>{u.emailVerified ? "Yes" : "No"}</td>
                  <td>{u.createdAt.toDateString()}</td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={5}>No users yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
