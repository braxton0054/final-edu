"use client";

import { useCallback, useEffect, useState } from "react";

type Teacher = { id: string; firstName: string | null; lastName: string | null };
type Assignment = {
  id: string;
  classId: string;
  learningArea: string | null;
  role: string;
  teacher: { id: string; firstName: string | null; lastName: string | null };
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
  padding: "0.55rem 0.7rem",
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: "0.9rem",
} as const;

function teacherName(t: { firstName: string | null; lastName: string | null }): string {
  return [t.firstName, t.lastName].filter(Boolean).join(" ") || "Teacher";
}

// Which teacher teaches which class/subject. This is what scopes everything
// a teacher login can see — no assignment, no access.
export default function TeacherAssignmentManager({
  teachers,
  classIds,
}: {
  teachers: Teacher[];
  classIds: string[];
}) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [classId, setClassId] = useState("");
  const [learningArea, setLearningArea] = useState("");
  const [role, setRole] = useState("subject_teacher");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await api("/api/teacher-assignments");
    if (data.ok && Array.isArray(data.assignments)) {
      setAssignments(data.assignments as Assignment[]);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [refresh]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const data = await api("/api/teacher-assignments", {
      method: "POST",
      body: JSON.stringify({ teacherId, classId, learningArea, role }),
    });
    setBusy(false);
    if (!data.ok) {
      setError(String(data.error ?? "Could not save."));
      return;
    }
    setClassId("");
    setLearningArea("");
    void refresh();
  }

  async function remove(id: string) {
    const data = await api(`/api/teacher-assignments?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!data.ok) {
      setError(String(data.error ?? "Could not remove."));
      return;
    }
    void refresh();
  }

  return (
    <div className="dash-panel" style={{ marginTop: "1rem" }}>
      <h2>Class assignments</h2>
      <p className="dash-muted" style={{ marginTop: "-0.4rem" }}>
        Teachers only see assigned classes. Tick class teacher where it applies —
        one teacher can hold several assignments.
      </p>
      <form onSubmit={add} style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <select required value={teacherId} onChange={(e) => setTeacherId(e.target.value)} style={input}>
          <option value="">Teacher…</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{teacherName(t)}</option>
          ))}
        </select>
        <input
          required
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          list="assign-classes"
          placeholder="Class (e.g. Grade 6A)"
          style={input}
        />
        <datalist id="assign-classes">
          {classIds.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <input
          value={learningArea}
          onChange={(e) => setLearningArea(e.target.value)}
          placeholder="Learning area (optional)"
          style={input}
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} style={input}>
          <option value="subject_teacher">Subject teacher</option>
          <option value="class_teacher">Class teacher</option>
        </select>
        <button type="submit" disabled={busy}>{busy ? "…" : "Assign"}</button>
      </form>
      {error && <p style={{ color: "#b45309" }}>{error}</p>}
      {assignments.length === 0 ? (
        <p className="dash-muted">No assignments yet.</p>
      ) : (
        <table className="dash-table">
          <thead>
            <tr>
              <th>Teacher</th>
              <th>Class</th>
              <th>Area</th>
              <th>Role</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id}>
                <td>{teacherName(a.teacher)}</td>
                <td>{a.classId}</td>
                <td>{a.learningArea ?? "—"}</td>
                <td>{a.role === "class_teacher" ? "Class teacher" : "Subject"}</td>
                <td>
                  <button type="button" onClick={() => remove(a.id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
