"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteLogo from "../../components/SiteLogo";

const STEPS = ["Request reset code", "Enter the code", "Set a new password"];

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
    <div className="reg-shell">
      <aside className="reg-rail">
        <div>
          <Link href="/login" className="back">← Back to login</Link>
        </div>
        <SiteLogo tone="light" height={44} />
        <div>
          <h2 style={{ margin: "0 0 0.5rem" }}>Almost there</h2>
          <p style={{ color: "#9aa4ae", fontSize: "0.92rem" }}>
            Enter the code from your email, then choose a new password.
          </p>
          <ol className="reg-mini-steps">
            {STEPS.map((step, i) => {
              const cls = i === 0 ? "done" : i === 1 ? "current" : undefined;
              return (
                <li key={step} className={cls}>
                  <span className="reg-mini-dot">{i === 0 ? "✓" : i + 1}</span>
                  {step}
                </li>
              );
            })}
          </ol>
        </div>
        <div className="reg-rail-foot">
          <p>
            <a href="mailto:mtandaolabs@gmail.com">mtandaolabs@gmail.com</a>
            <br />
            <a href="tel:+254728249135">+254 728 249135</a>
          </p>
        </div>
      </aside>
      <main className="reg-main">
        <div className="reg-card" style={{ maxWidth: 440 }}>
          <div className="reg-kicker">Account recovery</div>
          <h1>Set a new password</h1>
          {!done ? (
            <>
              <p className="reg-sub">
                Your code expires 10 minutes after it was sent. Need another
                one? <Link href="/forgot-password">Request again</Link>.
              </p>
              <form onSubmit={submit}>
                <div className="reg-field">
                  <span>Email address</span>
                  <input
                    className="reg-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@school.co.ke"
                    autoComplete="email"
                  />
                </div>
                <div className="reg-field">
                  <span>
                    Reset code <small>— 6 digits from your email</small>
                  </span>
                  <input
                    className="reg-input"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    autoComplete="one-time-code"
                  />
                </div>
                <div className="reg-field">
                  <span>New password</span>
                  <input
                    className="reg-input"
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                  />
                </div>
                <div className="reg-field">
                  <span>Confirm new password</span>
                  <input
                    className="reg-input"
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat the new password"
                    autoComplete="new-password"
                  />
                </div>
                {error && <p className="reg-error">{error}</p>}
                <button
                  className="reg-btn reg-btn-primary"
                  type="submit"
                  disabled={busy}
                  style={{ width: "100%" }}
                >
                  {busy ? "Resetting…" : "Set new password"}
                </button>
              </form>
            </>
          ) : (
            <div className="reg-success-box">
              <p style={{ marginTop: 0 }}>
                <strong>Password updated.</strong>
              </p>
              <p className="reg-sub" style={{ marginBottom: "1.25rem" }}>
                Sign in with your new password to continue.
              </p>
              <Link
                className="reg-btn reg-btn-primary"
                href="/login"
                style={{ textDecoration: "none", display: "inline-block" }}
              >
                Sign in →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
