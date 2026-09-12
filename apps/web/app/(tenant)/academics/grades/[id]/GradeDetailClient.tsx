"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StreamInfo = {
  id: string;
  name: string;
  displayName: string;
  maxStudents: number | null;
  enrollments: number;
  classTeacher: { id: string; name: string } | null;
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

// Streams, class teachers, and learning-area defaults for one grade.
export default function GradeDetailClient({
  gradeId,
  streams,
  gradeAreaIds,
  effective,
  areas,
  teachers,
}: {
  gradeId: string;
  streams: StreamInfo[];
  gradeAreaIds: string[];
  effective: { streamId: string; areas: string[] }[];
  areas: { id: string; name: string }[];
  teachers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sName, setSName] = useState("");
  const [sDisplay, setSDisplay] = useState("");
  const [sMax, setSMax] = useState("");
  const [ctStream, setCtStream] = useState("");
  const [ctTeacher, setCtTeacher] = useState("");
  const [checked, setChecked] = useState<string[]>(gradeAreaIds);
  const [ovStream, setOvStream] = useState("");
  const [ovArea, setOvArea] = useState("");
  const [ovOffered, setOvOffered] = useState(true);

  async function call(path: string, init?: RequestInit, tag = "x") {
    setBusy(tag);
    setError(null);
    const data = await api(path, init);
    setBusy(null);
    if (!data.ok) {
      setError(String(data.error ?? "Failed."));
      return false;
    }
    router.refresh();
    return true;
  }

  async function addStream(e: React.FormEvent) {
    e.preventDefault();
    const ok = await call(
      "/api/academics/streams",
      {
        method: "POST",
        body: JSON.stringify({
          gradeId,
          name: sName,
          displayName: sDisplay,
          maxStudents: sMax ? Number(sMax) : null,
        }),
      },
      "stream"
    );
    if (ok) {
      setSName("");
      setSDisplay("");
      setSMax("");
    }
  }

  async function setClassTeacher(e: React.FormEvent) {
    e.preventDefault();
    await call(
      "/api/academics/class-teachers",
      { method: "POST", body: JSON.stringify({ streamId: ctStream, teacherId: ctTeacher }) },
      "ct"
    );
  }

  async function saveAreas(e: React.FormEvent) {
    e.preventDefault();
    await call(
      "/api/academics/grade-areas",
      { method: "POST", body: JSON.stringify({ gradeId, learningAreaIds: checked }) },
      "areas"
    );
  }

  async function saveOverride(e: React.FormEvent) {
    e.preventDefault();
    await call(
      "/api/academics/grade-areas",
      {
        method: "POST",
        body: JSON.stringify({ streamId: ovStream, learningAreaId: ovArea, offered: ovOffered }),
      },
      "ov"
    );
  }

  function toggleArea(id: string) {
    setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  const effectiveMap = new Map(effective.map((e) => [e.streamId, e.areas]));

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {error && <p style={{ color: "#b45309", margin: 0 }}>{error}</p>}

      <div className="dash-panel">
        <h2>Streams ({streams.length})</h2>
        {streams.length === 0 ? (
          <p className="dash-muted">No streams yet — add the first below.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Stream</th>
                <th>Display</th>
                <th>Students</th>
                <th>Class teacher</th>
                <th>Areas</th>
              </tr>
            </thead>
            <tbody>
              {streams.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.displayName}</td>
                  <td>{s.enrollments}</td>
                  <td>{s.classTeacher ? s.classTeacher.name : "—"}</td>
                  <td style={{ fontSize: "0.85rem" }}>
                    {(effectiveMap.get(s.id) ?? []).join(", ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <form onSubmit={addStream} style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "0.9rem" }}>
          <input required value={sName} onChange={(e) => setSName(e.target.value)} maxLength={40} placeholder="Stream name (A)" style={input} />
          <input value={sDisplay} onChange={(e) => setSDisplay(e.target.value)} maxLength={80} placeholder="Display (optional)" style={input} />
          <input type="number" min="1" value={sMax} onChange={(e) => setSMax(e.target.value)} placeholder="Max" style={{ ...input, width: 90 }} />
          <button type="submit" disabled={busy !== null}>{busy === "stream" ? "…" : "Add stream"}</button>
        </form>
      </div>

      <div className="dash-panel">
        <h2>Class teacher</h2>
        <p className="dash-muted" style={{ marginTop: "-0.4rem" }}>
          One active holder per stream — assigning a new one retires the previous.
        </p>
        <form onSubmit={setClassTeacher} style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <select required value={ctStream} onChange={(e) => setCtStream(e.target.value)} style={input}>
            <option value="">Stream…</option>
            {streams.map((s) => (
              <option key={s.id} value={s.id}>{s.displayName}</option>
            ))}
          </select>
          <select required value={ctTeacher} onChange={(e) => setCtTeacher(e.target.value)} style={input}>
            <option value="">Teacher…</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button type="submit" disabled={busy !== null}>{busy === "ct" ? "…" : "Set class teacher"}</button>
        </form>
      </div>

      <div className="dash-panel">
        <h2>Default learning areas</h2>
        <p className="dash-muted" style={{ marginTop: "-0.4rem" }}>
          Every stream inherits these unless overridden below.
        </p>
        <form onSubmit={saveAreas}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.8rem" }}>
            {areas.map((a) => (
              <label
                key={a.id}
                style={{
                  border: "1.5px solid",
                  borderColor: checked.includes(a.id) ? "var(--brand-accent)" : "var(--line)",
                  borderRadius: 999,
                  padding: "0.35rem 0.8rem",
                  fontSize: "0.88rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={checked.includes(a.id)}
                  onChange={() => toggleArea(a.id)}
                  style={{ marginRight: "0.35rem" }}
                />
                {a.name}
              </label>
            ))}
            {areas.length === 0 && <span className="dash-muted">No learning areas yet — add them first.</span>}
          </div>
          <button type="submit" disabled={busy !== null}>{busy === "areas" ? "…" : "Save defaults"}</button>
        </form>
      </div>

      <div className="dash-panel">
        <h2>Stream exception</h2>
        <p className="dash-muted" style={{ marginTop: "-0.4rem" }}>
          e.g. 6A offers French while the grade default does not — or drops an area.
        </p>
        <form onSubmit={saveOverride} style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <select required value={ovStream} onChange={(e) => setOvStream(e.target.value)} style={input}>
            <option value="">Stream…</option>
            {streams.map((s) => (
              <option key={s.id} value={s.id}>{s.displayName}</option>
            ))}
          </select>
          <select required value={ovArea} onChange={(e) => setOvArea(e.target.value)} style={input}>
            <option value="">Area…</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select value={ovOffered ? "1" : "0"} onChange={(e) => setOvOffered(e.target.value === "1")} style={input}>
            <option value="1">Offered</option>
            <option value="0">Not offered</option>
          </select>
          <button type="submit" disabled={busy !== null}>{busy === "ov" ? "…" : "Save exception"}</button>
        </form>
      </div>
    </div>
  );
}
