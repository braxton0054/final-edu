"use client";

import { useEffect, useState } from "react";

const field = {
  display: "block",
  width: "100%",
  padding: "0.6rem",
  borderRadius: 8,
  border: "1px solid #ccc",
} as const;

export default function ResetPasswordForm({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    searchParams.then((p) => {
      if (p.email) setEmail(p.email);
    });
  }, [searchParams]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, password }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Reset failed.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "4rem 1.25rem", fontFamily: "system-ui, sans-serif" }}>
      <a href="/login">← Back to login</a>
      <h1>Reset password</h1>
      {!done ? (
        <form onSubmit={submit} style={{ display: "grid", gap: "0.75rem" }}>
          <label>Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={field} /></label>
          <label>Reset code
            <input required value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric"
              maxLength={6} placeholder="123456" style={field} /></label>
          <label>New password
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={field} /></label>
          <label>Confirm new password
            <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} style={field} /></label>
          {error && <p style={{ color: "#b45309" }}>{error}</p>}
          <button type="submit" disabled={busy}>{busy ? "Resetting…" : "Set new password"}</button>
        </form>
      ) : (
        <div>
          <p><strong>Password updated.</strong></p>
          <p><a href="/login">Sign in →</a></p>
        </div>
      )}
    </div>
  );
}
