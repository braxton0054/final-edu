"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GradeCreate() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/academics/grades", {
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

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: "0.6rem", marginBottom: "1rem" }}>
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={80}
        placeholder="New grade (e.g. Grade 6)"
        style={{ padding: "0.55rem 0.7rem", borderRadius: 8, border: "1px solid #ccc", minWidth: 240 }}
      />
      <button type="submit" disabled={busy}>{busy ? "…" : "Add grade"}</button>
      {error && <span style={{ color: "#b45309", alignSelf: "center" }}>{error}</span>}
    </form>
  );
}
