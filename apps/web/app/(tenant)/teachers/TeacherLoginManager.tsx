"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  fontSize: "0.88rem",
} as const;

// Creates the TEACHER login linked to a teacher row. Until linked, the
// teacher cannot sign in to the teacher portal.
export default function TeacherLoginManager({
  teachers,
}: {
  teachers: { id: string; name: string; hasLogin: boolean }[];
}) {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const unlinked = teachers.filter((t) => !t.hasLogin);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const data = await api("/api/teacher-logins", {
      method: "POST",
      body: JSON.stringify({ teacherId, email, password }),
    });
    setBusy(false);
    if (!data.ok) {
      setError(String(data.error ?? "Could not create login."));
      return;
    }
    setNotice("Login created — share the email and password with the teacher.");
    setTeacherId("");
    setEmail("");
    setPassword("");
    router.refresh();
  }

  if (unlinked.length === 0) return null;

  return (
    <div className="dash-panel" style={{ marginTop: "1rem" }}>
      <h2>Teacher logins</h2>
      <p className="dash-muted" style={{ marginTop: "-0.4rem" }}>
        Teachers sign in with these accounts to reach their portal. Logins stay
        scoped to assigned classes.
      </p>
      <form onSubmit={submit} style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        <select required value={teacherId} onChange={(e) => setTeacherId(e.target.value)} style={input}>
          <option value="">Teacher…</option>
          {unlinked.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (login)"
          style={input}
        />
        <input
          required
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Temporary password"
          style={input}
        />
        <button type="submit" disabled={busy}>{busy ? "…" : "Create login"}</button>
      </form>
      {error && <p style={{ color: "#b45309" }}>{error}</p>}
      {notice && <p style={{ color: "#15803d" }}>{notice}</p>}
    </div>
  );
}
