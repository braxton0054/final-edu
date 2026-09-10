"use client";

import { useEffect, useState } from "react";

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    searchParams.then(({ token }) => {
      if (!token) {
        setState("error");
        setMessage("Missing verification token.");
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

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "4rem 1.25rem", fontFamily: "system-ui, sans-serif" }}>
      <a href="/">← Back home</a>
      <h1>Email verification</h1>
      {state === "loading" && <p>Verifying your email…</p>}
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
