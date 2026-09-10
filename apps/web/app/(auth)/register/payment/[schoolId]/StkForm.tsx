"use client";

import { useState } from "react";

export default function StkForm({ schoolId, amount }: { schoolId: string; amount: number }) {
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function send() {
    setState("busy");
    setMessage("");
    try {
      const res = await fetch("/api/platform-payments/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, phone }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Could not send the prompt.");
      setState("sent");
    } catch (e) {
      setState("error");
      setMessage(e instanceof Error ? e.message : "Could not send the prompt.");
    }
  }

  if (state === "sent") {
    return (
      <div>
        <p><strong>Payment prompt sent.</strong> Enter your M-Pesa PIN on your phone to complete KSh {amount.toLocaleString()}.</p>
        <p><small>Once confirmed, your subscription activates and onboarding unlocks.</small></p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "0.75rem", maxWidth: 420 }}>
      <label>M-Pesa phone number
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="07XX XXX XXX"
          style={{ display: "block", width: "100%", padding: "0.6rem", marginTop: "0.25rem", borderRadius: "8px", border: "1px solid #ccc" }}
        />
      </label>
      <div>
        <button type="button" onClick={send} disabled={state === "busy"}>
          {state === "busy" ? "Sending…" : `Pay KSh ${amount.toLocaleString()} with M-Pesa`}
        </button>
      </div>
      {state === "error" && <p style={{ color: "#b45309" }}>{message}</p>}
    </div>
  );
}
