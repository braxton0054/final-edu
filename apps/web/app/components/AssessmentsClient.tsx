"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Assessment = {
  id: string;
  title: string;
  classId: string;
  learningArea: string | null;
  type: string;
  term: string | null;
  maxScore: number | null;
  status: string;
  dueDate: string | null;
  _count: { scores: number };
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
  padding: "0.55rem 0.7rem",
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: "0.92rem",
} as const;

const TYPES = [
  { value: "assignment", label: "Assignment" },
  { value: "quiz", label: "Quiz" },
  { value: "test", label: "Test" },
  { value: "exam", label: "Exam" },
  { value: "cbc", label: "CBC activity" },
];

export default function AssessmentsClient({
  classIds,
  defaultTerm,
  basePath,
}: {
  classIds: string[];
  defaultTerm: string;
  basePath: string;
}) {
  const [items, setItems] = useState<Assessment[]>([]);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    classId: classIds[0] ?? "",
    learningArea: "",
    type: "test",
    term: defaultTerm,
    maxScore: "",
    dueDate: "",
    instructions: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await api("/api/assessments");
    if (data.ok && Array.isArray(data.assessments)) {
      setItems(data.assessments as Assessment[]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [refresh]);

  function set(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const data = await api("/api/assessments", { method: "POST", body: JSON.stringify(form) });
    setBusy(false);
    if (!data.ok) {
      setError(String(data.error ?? "Could not create."));
      return;
    }
    setForm({ title: "", classId: classIds[0] ?? "", learningArea: "", type: "test", term: defaultTerm, maxScore: "", dueDate: "", instructions: "" });
    setShowForm(false);
    void refresh();
  }

  const filtered = filter
    ? items.filter((a) => a.classId === filter)
    : items;

  return (
    <div>
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: "0.55rem", borderRadius: 8, border: "1px solid #ccc" }}>
          <option value="">All classes</option>
          {classIds.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button type="button" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ New assessment"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="dash-panel" style={{ marginBottom: "1rem" }}>
          <h2>New assessment</h2>
          <div style={{ display: "grid", gap: "0.7rem" }}>
            <label>Title<input required value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200} style={input} /></label>
            <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
              <label style={{ flex: 1, minWidth: 140 }}>Class
                <select required value={form.classId} onChange={(e) => set("classId", e.target.value)} style={input}>
                  {classIds.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label style={{ flex: 1, minWidth: 140 }}>Type
                <select value={form.type} onChange={(e) => set("type", e.target.value)} style={input}>
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </label>
              <label style={{ flex: 1, minWidth: 140 }}>Learning area
                <input value={form.learningArea} onChange={(e) => set("learningArea", e.target.value)} placeholder="e.g. Mathematics" style={input} />
              </label>
            </div>
            <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
              <label style={{ flex: 1, minWidth: 140 }}>Term
                <input value={form.term} onChange={(e) => set("term", e.target.value)} placeholder="e.g. Term 3" style={input} />
              </label>
              <label style={{ flex: 1, minWidth: 140 }}>Max score
                <input type="number" min="1" step="any" value={form.maxScore} onChange={(e) => set("maxScore", e.target.value)} placeholder="e.g. 100" style={input} />
              </label>
              <label style={{ flex: 1, minWidth: 140 }}>Due date
                <input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} style={input} />
              </label>
            </div>
            <label>Instructions
              <textarea value={form.instructions} onChange={(e) => set("instructions", e.target.value)} rows={3} maxLength={4000} placeholder="For assignments: what should learners do?" style={input} />
            </label>
            {error && <p style={{ color: "#b45309", margin: 0 }}>{error}</p>}
            <div>
              <button type="submit" disabled={busy}>{busy ? "Creating…" : "Create draft"}</button>
            </div>
          </div>
        </form>
      )}

      {filtered.length === 0 ? (
        <p className="dash-muted">No assessments yet.</p>
      ) : (
        <div className="dash-panel">
          {filtered.map((a) => (
            <div className="dash-row" key={a.id}>
              <span className="k">
                <Link href={`${basePath}/${a.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                  <strong>{a.title}</strong>
                </Link>
                <br />
                <small style={{ color: "var(--muted)" }}>
                  {a.classId}
                  {a.learningArea ? ` · ${a.learningArea}` : ""} · {a.type} · {a._count.scores} scored
                </small>
              </span>
              <span className="v" style={{ fontSize: "0.82rem" }}>{a.status.toUpperCase()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
