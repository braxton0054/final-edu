"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Login failed.");
      const next = searchParams.get("next");
      window.location.href =
        next && next.startsWith("/") ? next : data.redirect;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label className="reg-field"><span>Email address</span>
        <input className="reg-input" type="email" value={email}
          onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
      <label className="reg-field"><span>Password</span>
        <input className="reg-input" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
      {error && <div className="reg-error">{error}</div>}
      <button type="submit" className="reg-btn reg-btn-primary" disabled={busy}
        style={{ width: "100%", marginTop: "0.5rem" }}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
