"use client";

import { useEffect, useState } from "react";

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const [state, setState] = useState<"loading" | "code" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    searchParams.then(({ token }) => {
      if (!token) {
        setState("code");
        return;
      }
      fetch(`/api/verify-email?token=${encodeURIComponent(token)}`)
        .then(async (r) => {
          const data = await r.json();
          if (!data.ok) throw new Error(data.error || "Verification failed.");
          setState("ok");
        })
        .catch((e) => {
          setState("error");
          setMessage(e instanceof Error ? e.message : "Verification failed.");
        });
    });
  }, [searchParams]);

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/verify-email/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Verification failed.");
      setState("ok");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "4rem 1.25rem", fontFamily: "system-ui, sans-serif" }}>
      <a href="/">← Back home</a>
      <h1>Email verification</h1>
      {state === "loading" && <p>Verifying your email…</p>}
      {state === "code" && (
        <form onSubmit={submitCode} style={{ display: "grid", gap: "0.75rem", maxWidth: 380 }}>
          <p>Enter the 6-digit code from your confirmation email.</p>
          <label>Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              style={{ display: "block", width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #ccc" }} /></label>
          <label>Code
            <input required value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric"
              maxLength={6} placeholder="123456"
              style={{ display: "block", width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #ccc" }} /></label>
          {message && <p style={{ color: "#b45309" }}>{message}</p>}
          <button type="submit" disabled={busy}>{busy ? "Verifying…" : "Verify email"}</button>
        </form>
      )}
      {state === "ok" && (
        <div>
          <p><strong>Email verified.</strong> Your school account is active on a 3-month free trial.</p>
          <p><a href="/login">Continue to login →</a></p>
        </div>
      )}
      {state === "error" && <p style={{ color: "#b45309" }}>{message}</p>}
    </div>
  );
}
