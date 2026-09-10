"use client";

import { useState } from "react";

const field = {
  display: "block",
  width: "100%",
  padding: "0.6rem",
  borderRadius: 8,
  border: "1px solid #ccc",
} as const;

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    setBusy(false);
    setSent(true);
  }

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", padding: "4rem 1.25rem", fontFamily: "system-ui, sans-serif" }}>
      <a href="/login">← Back to login</a>
      <h1>Forgot password</h1>
      {!sent ? (
        <form onSubmit={submit} style={{ display: "grid", gap: "0.75rem" }}>
          <p style={{ color: "#5b6470" }}>Enter your account email — we will send a reset code.</p>
          <label>Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={field} /></label>
          <button type="submit" disabled={busy}>{busy ? "Sending…" : "Send reset code"}</button>
        </form>
      ) : (
        <div>
          <p>If that email exists, a reset code is on its way (10 minutes to use it).</p>
          <p><a href={`/reset-password?email=${encodeURIComponent(email)}`}>Enter code →</a></p>
        </div>
      )}
    </div>
  );
}
