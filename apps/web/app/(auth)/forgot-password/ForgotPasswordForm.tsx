"use client";

import { useState } from "react";
import Link from "next/link";
import SiteLogo from "../../components/SiteLogo";

const STEPS = ["Request reset code", "Enter the code", "Set a new password"];

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
    <div className="reg-shell">
      <aside className="reg-rail">
        <div>
          <Link href="/login" className="back">← Back to login</Link>
        </div>
        <SiteLogo tone="light" height={44} />
        <div>
          <h2 style={{ margin: "0 0 0.5rem" }}>Reset your password</h2>
          <p style={{ color: "#9aa4ae", fontSize: "0.92rem" }}>
            Three quick steps and you are back in.
          </p>
          <ol className="reg-mini-steps">
            {STEPS.map((step, i) => {
              const cls =
                (!sent && i === 0) || (sent && i === 1)
                  ? "current"
                  : sent && i === 0
                    ? "done"
                    : undefined;
              return (
                <li key={step} className={cls}>
                  <span className="reg-mini-dot">{sent && i === 0 ? "✓" : i + 1}</span>
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
          <h1>Forgot password</h1>
          {!sent ? (
            <>
              <p className="reg-sub">
                Enter your account email — we will send a 6-digit reset code.
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
                <button
                  className="reg-btn reg-btn-primary"
                  type="submit"
                  disabled={busy}
                  style={{ width: "100%" }}
                >
                  {busy ? "Sending…" : "Send reset code"}
                </button>
              </form>
            </>
          ) : (
            <div className="reg-success-box">
              <p style={{ marginTop: 0 }}>
                <strong>Check your inbox.</strong>
              </p>
              <p className="reg-sub" style={{ marginBottom: "1.25rem" }}>
                If {email} exists on MtandaoLabsEdu, a reset code is on its
                way — it expires in 10 minutes.
              </p>
              <Link
                className="reg-btn reg-btn-primary"
                href={`/reset-password?email=${encodeURIComponent(email)}`}
                style={{ textDecoration: "none", display: "inline-block" }}
              >
                Enter code →
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
