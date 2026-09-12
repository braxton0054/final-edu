"use client";

import { useCallback, useEffect, useState } from "react";

type Row = {
  id: string;
  status: string;
  teacher: { id: string; firstName: string | null; lastName: string | null };
  grade: { name: string };
  stream: { displayName: string };
  learningArea: { name: string } | null;
  academicYear: { name: string };
  term: { name: string } | null;
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
  padding: "0.5rem 0.65rem",
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: "0.9rem",
} as const;

function teacherName(t: { firstName: string | null; lastName: string | null }): string {
  return [t.firstName, t.lastName].filter(Boolean).join(" ") || "Teacher";
}

export default function AssignmentsClient({
  grades,
  teachers,
  areas,
}: {
  grades: { id: string; name: string; streams: { id: string; displayName: string }[] }[];
  teachers: { id: string; name: string }[];
  areas: { id: string; name: string }[];
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [fTeacher, setFTeacher] = useState("");
  const [fGrade, setFGrade] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [gradeId, setGradeId] = useState("");
  const [streamId, setStreamId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const q = new URLSearchParams();
    if (fTeacher) q.set("teacherId", fTeacher);
    if (fGrade) q.set("gradeId", fGrade);
    const data = await api(`/api/academics/assignments?${q.toString()}`);
    if (data.ok && Array.isArray(data.assignments)) {
      setRows(data.assignments as Row[]);
    }
  }, [fTeacher, fGrade]);

  useEffect(() => {
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [refresh]);

  const streams = grades.find((g) => g.id === gradeId)?.streams ?? [];

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const data = await api("/api/academics/assignments", {
      method: "POST",
      body: JSON.stringify({ teacherId, streamId, learningAreaId: areaId || null }),
    });
    setBusy(false);
    if (!data.ok) {
      setError(String(data.error ?? "Could not assign."));
      return;
    }
    setStreamId("");
    setAreaId("");
    void refresh();
  }

  async function deactivate(id: string) {
    const data = await api(`/api/academics/assignments?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!data.ok) setError(String(data.error ?? "Could not remove."));
    else void refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <select value={fTeacher} onChange={(e) => setFTeacher(e.target.value)} style={input}>
          <option value="">All teachers</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <select value={fGrade} onChange={(e) => setFGrade(e.target.value)} style={input}>
          <option value="">All grades</option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
      </div>

      <form onSubmit={create} className="dash-panel" style={{ marginBottom: "1rem" }}>
        <h2>Assign teacher</h2>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <select required value={teacherId} onChange={(e) => setTeacherId(e.target.value)} style={input}>
            <option value="">Teacher…</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select required value={gradeId} onChange={(e) => { setGradeId(e.target.value); setStreamId(""); }} style={input}>
            <option value="">Grade…</option>
            {grades.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <select required value={streamId} onChange={(e) => setStreamId(e.target.value)} style={input}>
            <option value="">Stream…</option>
            {streams.map((s) => (
              <option key={s.id} value={s.id}>{s.displayName}</option>
            ))}
          </select>
          <select value={areaId} onChange={(e) => setAreaId(e.target.value)} style={input}>
            <option value="">Area (optional)…</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <button type="submit" disabled={busy}>{busy ? "…" : "Assign"}</button>
        </div>
        {error && <p style={{ color: "#b45309" }}>{error}</p>}
        <p className="dash-muted" style={{ marginBottom: 0 }}>
          Saved to the current academic year and term automatically.
        </p>
      </form>

      <div className="dash-panel">
        {rows.length === 0 ? (
          <p className="dash-muted">No assignments yet.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Grade</th>
                <th>Stream</th>
                <th>Area</th>
                <th>Year · Term</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{teacherName(r.teacher)}</td>
                  <td>{r.grade.name}</td>
                  <td>{r.stream.displayName}</td>
                  <td>{r.learningArea?.name ?? "—"}</td>
                  <td style={{ fontSize: "0.85rem" }}>
                    {r.academicYear.name}
                    {r.term ? ` · ${r.term.name}` : ""}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" onClick={() => deactivate(r.id)}>Remove</button>
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
