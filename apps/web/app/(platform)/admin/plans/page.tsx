import { prisma } from "@mtanda/database";

const input = {
  width: "7rem",
  padding: "0.4rem 0.5rem",
  borderRadius: "8px",
  border: "1px solid var(--line)",
  background: "var(--bg)",
  color: "var(--ink)",
} as const;

export default async function PlansPage() {
  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { subscriptions: true } } },
  });

  return (
    <>
      <div className="admin-top"><h1>Plans &amp; Pricing</h1></div>
      <div className="admin-body">
        <p style={{ color: "var(--muted)" }}>
          Configuration-driven — adjust prices and limits here, never in code.
          The pricing page, signup, and enrollment checks read these rows live.
          Leave max students empty for unlimited (Custom).
        </p>
        <div className="admin-panel">
          <h2>Create plan</h2>
          <form action="/api/admin/plans" method="POST"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.75rem", alignItems: "end" }}>
            <label>Name *<input name="name" required style={input} /></label>
            <label>Slug <small>(auto)</small><input name="slug" style={input} /></label>
            <label>Quarterly (KSh)<input name="quarterlyPrice" type="number" min={0} step={100} defaultValue={0} style={input} /></label>
            <label>Min<input name="minStudents" type="number" min={0} defaultValue={0} style={input} /></label>
            <label>Max <small>(blank ∞)</small><input name="maxStudents" type="number" min={0} style={input} /></label>
            <label>Grace<input name="graceStudents" type="number" min={0} defaultValue={2} style={input} /></label>
            <label>Trial days<input name="trialDays" type="number" min={0} defaultValue={90} style={input} /></label>
            <div><button type="submit">Create</button></div>
          </form>
        </div>
        <div className="admin-panel">
          <table className="admin-table">
            <thead>
              <tr><th>Plan</th><th>Price / 3 mo (KSh)</th><th>Min</th><th>Max</th><th>Grace</th><th>Trial (days)</th><th>Schools</th><th>Active</th><th></th></tr>
            </thead>
            <tbody>
              {plans.map((p) => {
                const formId = `plan-${p.slug}`;
                return (
                  <tr key={p.slug}>
                    <td><strong>{p.name}</strong></td>
                    <td>
                      <input name="quarterlyPrice" form={formId} type="number" min={0} step={100}
                        defaultValue={Number(p.quarterlyPrice)} style={input} />
                    </td>
                    <td>
                      <input name="minStudents" form={formId} type="number" min={0}
                        defaultValue={p.minStudents} style={{ ...input, width: "5rem" }} />
                    </td>
                    <td>
                      <input name="maxStudents" form={formId} type="number" min={0}
                        defaultValue={p.maxStudents ?? ""} placeholder="∞" style={{ ...input, width: "5rem" }} />
                    </td>
                    <td>
                      <input name="graceStudents" form={formId} type="number" min={0}
                        defaultValue={p.graceStudents} style={{ ...input, width: "4rem" }} />
                    </td>
                    <td>
                      <input name="trialDays" form={formId} type="number" min={0}
                        defaultValue={p.trialDays} style={{ ...input, width: "4.5rem" }} />
                    </td>
                    <td>{p._count.subscriptions}</td>
                    <td><span className={`admin-badge ${p.active ? "green" : ""}`}>{p.active ? "ON" : "OFF"}</span></td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <form id={formId} action={`/api/admin/plans/${p.slug}/update`} method="POST" style={{ display: "inline" }}>
                        <button type="submit">Save</button>
                      </form>{" "}
                      <form action={`/api/admin/plans/${p.slug}/toggle`} method="POST" style={{ display: "inline" }}>
                        <button type="submit">{p.active ? "Disable" : "Enable"}</button>
                      </form>{" "}
                      {p._count.subscriptions === 0 && (
                        <form action={`/api/admin/plans/${p.slug}/delete`} method="POST" style={{ display: "inline" }}>
                          <button type="submit">Delete</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
