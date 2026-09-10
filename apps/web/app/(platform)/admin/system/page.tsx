import { prisma } from "@mtanda/database";

export default async function SystemPage() {
  let db = "unreachable";
  let migrations = 0;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "connected";
    migrations = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*) FROM "_prisma_migrations"`
    ).then((r) => Number(r[0].count));
  } catch {
    // db stays "unreachable"
  }

  return (
    <>
      <div className="admin-top"><h1>System</h1></div>
      <div className="admin-body">
        <div className="admin-cards">
          <div className="admin-card">
            <div className="label">Database</div>
            <div className="value" style={{ fontSize: "1.3rem" }}>
              <span className={`admin-badge ${db === "connected" ? "green" : "red"}`}>{db.toUpperCase()}</span>
            </div>
          </div>
          <div className="admin-card">
            <div className="label">Applied migrations</div>
            <div className="value">{migrations}</div>
          </div>
          <div className="admin-card">
            <div className="label">Redis</div>
            <div className="value" style={{ fontSize: "1.3rem" }}>
              <span className="admin-badge">{process.env.REDIS_URL ? "CONFIGURED" : "NOT SET"}</span>
            </div>
          </div>
          <div className="admin-card">
            <div className="label">Next.js</div>
            <div className="value" style={{ fontSize: "1.3rem" }}>16.3.3</div>
          </div>
        </div>
        <div className="admin-panel">
          <h2>Background jobs &amp; queues</h2>
          <p style={{ color: "var(--muted)" }}>
            Worker scaffold is in place (email, WhatsApp, M-Pesa, PDF, reports).
            Job dashboards plug in here once BullMQ is wired to Redis.
          </p>
        </div>
      </div>
    </>
  );
}
