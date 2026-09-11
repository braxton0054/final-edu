"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type ScoreRow = {
  studentId: string;
  admissionNo: string;
  firstName: string | null;
  lastName: string | null;
  score: number | null;
  level: string | null;
  comment: string | null;
};

type Assessment = {
  id: string;
  title: string;
  classId: string;
  learningArea: string | null;
  type: string;
  term: string | null;
  maxScore: number | null;
  status: string;
  instructions: string | null;
  dueDate: string | null;
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

const cell = {
  padding: "0.45rem 0.5rem",
  borderRadius: 6,
  border: "1px solid #ccc",
  fontSize: "0.9rem",
  width: "100%",
} as const;

const LEVELS = ["", "BE", "AE", "ME", "EE"];

// Spreadsheet-style mark entry: score and/or CBC level per learner, one save
// for the whole sheet. Finalized sheets are read-only (staff can reopen).
export default function ScoreSheet({
  assessmentId,
  backHref,
  roster,
}: {
  assessmentId: string;
  backHref: string;
  roster: { studentId: string; admissionNo: string; name: string }[];
}) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [rows, setRows] = useState<ScoreRow[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const data = await api(`/api/assessments/${assessmentId}`);
    if (!data.ok) {
      setError(String(data.error ?? "Could not load."));
      return;
    }
    const a = data.assessment as Assessment & {
      scores: { studentId: string; score: number | null; level: string | null; comment: string | null }[];
    };
    setAssessment(a);
    setIsStaff(data.isStaff === true);
    const byStudent = new Map(a.scores.map((s) => [s.studentId, s]));
    setRows(
      roster.map((r) => {
        const s = byStudent.get(r.studentId);
        return {
          studentId: r.studentId,
          admissionNo: r.admissionNo,
          firstName: r.name,
          lastName: null,
          score: s?.score ?? null,
          level: s?.level ?? null,
          comment: s?.comment ?? null,
        };
      })
    );
  }, [assessmentId, roster]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  function setRow(studentId: string, patch: Partial<ScoreRow>) {
    setRows((rs) => rs.map((r) => (r.studentId === studentId ? { ...r, ...patch } : r)));
    setSaved(false);
  }

  async function save() {
    setBusy("save");
    setError(null);
    const data = await api(`/api/assessments/${assessmentId}/scores`, {
      method: "POST",
      body: JSON.stringify({
        scores: rows.map((r) => ({
          studentId: r.studentId,
          score: r.score,
          level: r.level,
          comment: r.comment,
        })),
      }),
    });
    setBusy(null);
    if (!data.ok) {
      setError(String(data.error ?? "Could not save."));
      return;
    }
    setSaved(true);
  }

  async function setStatus(status: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(status);
    setError(null);
    const data = await api(`/api/assessments/${assessmentId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    setBusy(null);
    if (!data.ok) {
      setError(String(data.error ?? "Could not update."));
      return;
    }
    void load();
  }

  const locked = assessment?.status === "finalized" && !isStaff;
  const numeric = assessment ? assessment.type !== "cbc" : true;

  return (
    <div>
      <Link href={backHref}>← Back</Link>
      {assessment && (
        <>
          <h1 style={{ marginBottom: "0.25rem" }}>{assessment.title}</h1>
          <p className="dash-sub">
            {assessment.classId}
            {assessment.learningArea ? ` · ${assessment.learningArea}` : ""} · {assessment.type}
            {assessment.maxScore !== null ? ` · out of ${assessment.maxScore}` : ""} ·{" "}
            {assessment.status.toUpperCase()}
          </p>
        </>
      )}
      {error && <p style={{ color: "#b45309" }}>{error}</p>}
      {saved && <p style={{ color: "#15803d" }}>Saved.</p>}
      {locked && (
        <p className="dash-muted">
          Finalized — scores are locked. An administrator can reopen this assessment.
        </p>
      )}

      <div style={{ overflowX: "auto" }}>
        <table className="dash-table" style={{ minWidth: 640 }}>
          <thead>
            <tr>
              <th>ADM</th>
              <th>Student</th>
              {numeric && <th>Score</th>}
              <th>Level</th>
              <th>Comment</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.studentId}>
                <td>{r.admissionNo}</td>
                <td>{r.firstName}</td>
                {numeric && (
                  <td style={{ width: 110 }}>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      disabled={locked}
                      value={r.score ?? ""}
                      onChange={(e) =>
                        setRow(r.studentId, {
                          score: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      style={cell}
                    />
                  </td>
                )}
                <td style={{ width: 96 }}>
                  <select
                    disabled={locked}
                    value={r.level ?? ""}
                    onChange={(e) => setRow(r.studentId, { level: e.target.value || null })}
                    style={cell}
                  >
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>{l || "—"}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    disabled={locked}
                    value={r.comment ?? ""}
                    onChange={(e) => setRow(r.studentId, { comment: e.target.value || null })}
                    maxLength={1000}
                    placeholder="Optional"
                    style={cell}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!locked && (
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <button type="button" onClick={save} disabled={busy !== null}>
            {busy === "save" ? "Saving…" : "Save draft"}
          </button>
          {assessment?.status === "draft" && (
            <button type="button" onClick={() => setStatus("published")} disabled={busy !== null}>
              Publish
            </button>
          )}
          {assessment?.status !== "finalized" && (
            <button
              type="button"
              onClick={() => setStatus("finalized", "Finalize these results? They will lock for editing.")}
              disabled={busy !== null}
            >
              {busy === "finalized" ? "…" : "Submit (finalize)"}
            </button>
          )}
          {assessment?.status === "finalized" && isStaff && (
            <button type="button" onClick={() => setStatus("draft")} disabled={busy !== null}>
              Reopen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
