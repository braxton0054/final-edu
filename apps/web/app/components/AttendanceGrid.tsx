"use client";

import { useCallback, useEffect, useState } from "react";

type Row = { studentId: string; admissionNo: string; name: string; status: string | null };

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  return (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    ok?: boolean;
  };
}

const CYCLE: Record<string, string> = {
  "": "present",
  present: "absent",
  absent: "late",
  late: "excused",
  excused: "",
};

const MARK: Record<string, string> = {
  present: "✓ Present",
  absent: "✕ Absent",
  late: "◷ Late",
  excused: "○ Excused",
};

// Tap-to-cycle attendance grid. One save persists the whole class day.
export default function AttendanceGrid({
  classIds,
  initialClassId,
  initialDate,
}: {
  classIds: string[];
  initialClassId: string;
  initialDate: string;
}) {
  const [classId, setClassId] = useState(initialClassId);
  const [date, setDate] = useState(initialDate);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async (c: string, d: string) => {
    setLoading(true);
    setError(null);
    setSaved(false);
    const data = await api(
      `/api/attendance?classId=${encodeURIComponent(c)}&date=${encodeURIComponent(d)}`
    );
    setLoading(false);
    if (!data.ok || !Array.isArray(data.roster)) {
      setError(String(data.error ?? "Could not load."));
      setRows([]);
      return;
    }
    setRows(data.roster as Row[]);
  }, []);

  useEffect(() => {
    // Timer callback (not the effect body) owns the fetch + setState.
    if (!classId || !date) return;
    const t = setTimeout(() => void load(classId, date), 0);
    return () => clearTimeout(t);
  }, [classId, date, load]);

  function cycle(studentId: string) {
    setRows((rs) =>
      rs.map((r) => (r.studentId === studentId ? { ...r, status: CYCLE[r.status ?? ""] ?? "present" } : r))
    );
    setSaved(false);
  }

  function markAll(status: string) {
    setRows((rs) => rs.map((r) => ({ ...r, status })));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const data = await api("/api/attendance", {
      method: "POST",
      body: JSON.stringify({
        classId,
        date,
        records: rows.filter((r) => r.status).map((r) => ({ studentId: r.studentId, status: r.status })),
      }),
    });
    setBusy(false);
    if (!data.ok) {
      setError(String(data.error ?? "Could not save."));
      return;
    }
    setSaved(true);
  }

  const counts = { present: 0, absent: 0, late: 0, excused: 0, unmarked: 0 };
  for (const r of rows) {
    if (r.status && r.status in counts) counts[r.status as keyof typeof counts]++;
    else counts.unmarked++;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <label>
          Class
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            style={{ display: "block", padding: "0.55rem", borderRadius: 8, border: "1px solid #ccc" }}
          >
            {classIds.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Date
          <input
            type="date"
            value={date}
            max={initialDate}
            onChange={(e) => setDate(e.target.value)}
            style={{ display: "block", padding: "0.55rem", borderRadius: 8, border: "1px solid #ccc" }}
          />
        </label>
        <div style={{ alignSelf: "end", display: "flex", gap: "0.5rem" }}>
          <button type="button" onClick={() => markAll("present")}>All present</button>
          <button type="button" onClick={save} disabled={busy || rows.length === 0}>
            {busy ? "Saving…" : "Save attendance"}
          </button>
        </div>
      </div>

      {error && <p style={{ color: "#b45309" }}>{error}</p>}
      {saved && <p style={{ color: "#15803d" }}>Saved.</p>}

      {loading ? (
        <p className="dash-muted">Loading…</p>
      ) : (
        <>
          <p className="dash-muted">
            {counts.present} present · {counts.absent} absent · {counts.late} late ·{" "}
            {counts.excused} excused · {counts.unmarked} unmarked — tap a row to cycle.
          </p>
          <div className="dash-panel">
            {rows.map((r) => (
              <button
                key={r.studentId}
                type="button"
                onClick={() => cycle(r.studentId)}
                style={{
                  display: "flex",
                  width: "100%",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.6rem",
                  padding: "0.6rem 0.75rem",
                  marginBottom: "0.4rem",
                  borderRadius: 8,
                  border: "1px solid var(--line)",
                  background: r.status === "absent" ? "rgba(200,16,46,0.06)" : "var(--bg)",
                  color: "var(--ink)",
                  cursor: "pointer",
                  fontSize: "0.93rem",
                }}
              >
                <span>
                  <strong>{r.name}</strong>{" "}
                  <small style={{ color: "var(--muted)" }}>{r.admissionNo}</small>
                </span>
                <span>{r.status ? MARK[r.status] : "— tap —"}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
