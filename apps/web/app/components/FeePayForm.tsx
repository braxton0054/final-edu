"use client";

import { useEffect, useRef, useState } from "react";

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
  display: "block",
  width: "100%",
  padding: "0.6rem",
  borderRadius: 8,
  border: "1px solid #ccc",
} as const;

// M-Pesa STK push for one child's outstanding balance. Full or custom amount,
// then poll the payment until Daraja confirms or it fails.
export default function FeePayForm({
  studentId,
  studentName,
  outstanding,
  defaultPhone,
}: {
  studentId: string;
  studentName: string;
  outstanding: number;
  defaultPhone: string;
}) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [amount, setAmount] = useState(String(Math.ceil(outstanding)));
  const [phone, setPhone] = useState(defaultPhone);
  const [mode, setMode] = useState<"idle" | "sent" | "done" | "failed">("idle");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api("/api/fees/pay").then((d) => setAvailable(Boolean(d.ok) && d.mpesa === true));
  }, []);

  useEffect(
    () => () => {
      if (poll.current) clearInterval(poll.current);
    },
    []
  );

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const data = await api("/api/fees/pay", {
      method: "POST",
      body: JSON.stringify({ studentId, amount: Number(amount), phone }),
    });
    setBusy(false);
    if (!data.ok) {
      setError(String(data.error ?? "Payment failed to start."));
      return;
    }
    const id = String(data.paymentId);
    setPaymentId(id);
    setMode("sent");
    poll.current = setInterval(async () => {
      const s = await api(`/api/fees/payments/${id}`);
      if (s.status === "COMPLETED") {
        if (poll.current) clearInterval(poll.current);
        setReceipt(typeof s.receipt === "string" ? s.receipt : null);
        setMode("done");
      } else if (s.status === "FAILED") {
        if (poll.current) clearInterval(poll.current);
        setMode("failed");
        setError("The M-Pesa payment did not complete. No money left your account for this attempt — try again.");
      }
    }, 4000);
  }

  if (available === false) return null;

  return (
    <div style={{ marginTop: "0.8rem", borderTop: "1px solid var(--line)", paddingTop: "0.8rem" }}>
      {mode === "done" ? (
        <p style={{ color: "#15803d", margin: 0 }}>
          <strong>Payment received{receipt ? ` — receipt ${receipt}` : ""}.</strong>
        </p>
      ) : mode === "sent" ? (
        <p style={{ margin: 0 }}>
          Check <strong>{phone}</strong> for the M-Pesa prompt and enter your PIN to pay for{" "}
          {studentName}. This page updates automatically.
        </p>
      ) : (
        <form onSubmit={pay} style={{ display: "grid", gap: "0.6rem" }}>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <label style={{ flex: 1, minWidth: 140 }}>
              Amount (KSh)
              <input
                type="number"
                min={10}
                max={Math.ceil(outstanding)}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={input}
              />
            </label>
            <label style={{ flex: 1, minWidth: 160 }}>
              M-Pesa phone
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XX XXX XXX"
                style={input}
              />
            </label>
          </div>
          {error && <p style={{ color: "#b45309", margin: 0 }}>{error}</p>}
          {mode === "failed" && !error && (
            <p style={{ color: "#b45309", margin: 0 }}>Payment failed. Try again.</p>
          )}
          <div>
            <button type="submit" disabled={busy}>
              {busy ? "Sending prompt…" : `Pay ${Number(amount || 0).toLocaleString()} via M-Pesa`}
            </button>
          </div>
        </form>
      )}
      {error && mode === "sent" && <p style={{ color: "#b45309" }}>{error}</p>}
    </div>
  );
}
