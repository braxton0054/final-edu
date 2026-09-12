"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AreasClient({
  initial,
}: {
  initial: { id: string; name: string; code: string | null }[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/academics/areas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    setBusy(false);
    if (!data.ok) {
      setError(data.error ?? "Could not create.");
      return;
    }
    setName("");
    router.refresh();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/academics/areas?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!data.ok) {
      setError(data.error ?? "Could not remove.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <form onSubmit={create} style={{ display: "flex", gap: "0.6rem", marginBottom: "1rem" }}>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="New learning area (e.g. French)"
          style={{ padding: "0.55rem 0.7rem", borderRadius: 8, border: "1px solid #ccc", minWidth: 260 }}
        />
        <button type="submit" disabled={busy}>{busy ? "…" : "Add"}</button>
        {error && <span style={{ color: "#b45309", alignSelf: "center" }}>{error}</span>}
      </form>
      <div className="dash-panel">
        {initial.length === 0 ? (
          <p className="dash-muted">No learning areas yet.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Name</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {initial.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" onClick={() => remove(a.id)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
