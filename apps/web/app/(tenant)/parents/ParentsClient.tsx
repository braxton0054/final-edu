"use client";

import { useCallback, useEffect, useState } from "react";

type Parent = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  children: { admissionNo: string; firstName: string; lastName: string }[];
};

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  return (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    ok?: boolean;
  };
}

const input = {
  display: "block",
  width: "100%",
  padding: "0.6rem",
  borderRadius: 8,
  border: "1px solid #ccc",
} as const;

export default function ParentsClient() {
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    admissionNos: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await api("/api/parents");
    if (data.ok && Array.isArray(data.parents)) {
      setParents(data.parents as Parent[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Timer callback (not the effect body) owns the fetch + setState, so the
    // initial load stays out of the synchronous effect pass.
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [refresh]);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const data = await api("/api/parents", { method: "POST", body: JSON.stringify(form) });
    setBusy(false);
    if (!data.ok) {
      setError(String(data.error ?? "Could not create parent."));
      return;
    }
    const linked = Number(data.linked ?? 0);
    setNotice(
      linked > 0
        ? `Parent created and linked to ${linked} child${linked === 1 ? "" : "ren"}.`
        : "Parent created, but no admission numbers matched — link children later."
    );
    setForm({ firstName: "", lastName: "", email: "", phone: "", password: "", admissionNos: "" });
    void refresh();
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem", maxWidth: 720 }}>
      <form
        onSubmit={submit}
        style={{ border: "1px solid #e6e9ee", borderRadius: 10, padding: "1rem 1.25rem" }}
      >
        <h2 style={{ marginTop: 0 }}>New parent account</h2>
        <div style={{ display: "grid", gap: "0.7rem" }}>
          <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
            <label style={{ flex: 1, minWidth: 160 }}>
              First name
              <input required value={form.firstName} onChange={(e) => set("firstName", e.target.value)} style={input} />
            </label>
            <label style={{ flex: 1, minWidth: 160 }}>
              Last name
              <input required value={form.lastName} onChange={(e) => set("lastName", e.target.value)} style={input} />
            </label>
          </div>
          <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
            <label style={{ flex: 1, minWidth: 160 }}>
              Email (login)
              <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} style={input} />
            </label>
            <label style={{ flex: 1, minWidth: 160 }}>
              Phone
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07XX XXX XXX" style={input} />
            </label>
          </div>
          <label>
            Temporary password <small style={{ color: "#5b6470" }}>(at least 8 characters — share it with the parent)</small>
            <input required type="password" minLength={8} value={form.password} onChange={(e) => set("password", e.target.value)} style={input} />
          </label>
          <label>
            Children&apos;s admission numbers <small style={{ color: "#5b6470" }}>(comma-separated)</small>
            <input value={form.admissionNos} onChange={(e) => set("admissionNos", e.target.value)} placeholder="e.g. GVA-0001, GVA-0002" style={input} />
          </label>
          {error && <p style={{ color: "#b45309", margin: 0 }}>{error}</p>}
          {notice && <p style={{ color: "#15803d", margin: 0 }}>{notice}</p>}
          <div>
            <button type="submit" disabled={busy}>{busy ? "Creating…" : "Create parent"}</button>
          </div>
        </div>
      </form>

      <div>
        <h2>Parents ({parents.length})</h2>
        {loading ? (
          <p style={{ color: "#5b6470" }}>Loading…</p>
        ) : parents.length === 0 ? (
          <p style={{ color: "#5b6470" }}>No parent accounts yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.6rem" }}>
            {parents.map((p) => (
              <li key={p.id} style={{ border: "1px solid #e6e9ee", borderRadius: 10, padding: "0.8rem 1rem" }}>
                <strong>
                  {[p.firstName, p.lastName].filter(Boolean).join(" ") || p.email}
                </strong>
                <div style={{ color: "#5b6470", fontSize: "0.88rem" }}>
                  {p.email}
                  {p.phone ? ` · ${p.phone}` : ""}
                </div>
                <div style={{ fontSize: "0.88rem", marginTop: "0.25rem" }}>
                  {p.children.length > 0
                    ? `Children: ${p.children.map((c) => `${c.firstName} ${c.lastName} (${c.admissionNo})`).join(", ")}`
                    : "No linked children."}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
