"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Settings = {
  notifyFees: boolean;
  notifyPayments: boolean;
  notifyResults: boolean;
  notifyAnnouncements: boolean;
};

type StatusView = {
  status: string;
  configured: boolean;
  phoneNumber: string | null;
  lastError: string | null;
  settings: Settings;
};

type Props = {
  initial: {
    status: string;
    configured: boolean;
    phoneNumber: string | null;
    lastError: string | null;
    settings: Settings;
  };
};

const TOGGLES: { key: keyof Settings; label: string; hint: string }[] = [
  { key: "notifyFees", label: "Fee invoices", hint: "Notify parents when a fee invoice is issued." },
  { key: "notifyPayments", label: "Payments & receipts", hint: "Confirm payments and send receipts." },
  { key: "notifyResults", label: "Results", hint: "Notify parents when results are published." },
  { key: "notifyAnnouncements", label: "Announcements", hint: "School announcements and assignments." },
];

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  return (await res.json().catch(() => ({}))) as Record<string, unknown> & { ok?: boolean };
}

export default function WhatsAppPanel({ initial }: Props) {
  const [view, setView] = useState<StatusView>({
    status: initial.status,
    configured: initial.configured,
    phoneNumber: initial.phoneNumber,
    lastError: initial.lastError,
    settings: initial.settings,
  });
  const [qr, setQr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const data = await api("/api/whatsapp/status");
    if (data.ok) {
      setView({
        status: String(data.status),
        configured: data.configured !== false,
        phoneNumber: (data.phoneNumber as string | null) ?? null,
        lastError: (data.lastError as string | null) ?? null,
        settings: (data as unknown as StatusView).settings ?? view.settings,
      });
      if (String(data.status) === "CONNECTED") setQr(null);
      return String(data.status);
    }
    return null;
  }, [view.settings]);

  // While a QR is on screen, poll until Evolution reports the scan.
  useEffect(() => {
    if (!qr) {
      if (poll.current) clearInterval(poll.current);
      return;
    }
    poll.current = setInterval(() => {
      void refresh();
    }, 4000);
    return () => {
      if (poll.current) clearInterval(poll.current);
    };
  }, [qr, refresh]);

  async function start(action: "connect" | "reconnect" | "disconnect") {
    setBusy(action);
    setError(null);
    const data = await api(`/api/whatsapp/${action}`, { method: "POST" });
    setBusy(null);
    if (!data.ok) {
      setError(String(data.error ?? "Something went wrong."));
      return;
    }
    if (action === "disconnect") {
      setQr(null);
      setView((v) => ({ ...v, status: "DISCONNECTED", phoneNumber: null }));
      return;
    }
    setView((v) => ({ ...v, status: String(data.status ?? "CONNECTING") }));
    setQr(typeof data.qrcode === "string" ? data.qrcode : null);
  }

  async function toggle(key: keyof Settings, value: boolean) {
    const data = await api("/api/whatsapp/settings", {
      method: "PATCH",
      body: JSON.stringify({ [key]: value }),
    });
    if (data.ok && data.settings) {
      setView((v) => ({ ...v, settings: data.settings as Settings }));
    } else {
      setError(String(data.error ?? "Could not save settings."));
    }
  }

  const connected = view.status === "CONNECTED";

  return (
    <div style={{ display: "grid", gap: "1.25rem", maxWidth: 640 }}>
      {!view.configured && (
        <div style={{ border: "1px solid #f0c36d", background: "#fff8e6", borderRadius: 10, padding: "0.9rem 1.1rem" }}>
          WhatsApp isn&apos;t available right now. Please try again later.
        </div>
      )}

      <div style={{ border: "1px solid #e6e9ee", borderRadius: 10, padding: "1rem 1.25rem" }}>
        <h2 style={{ marginTop: 0 }}>Connection</h2>
        <p>
          Status: <strong>{view.status}</strong>
          {view.phoneNumber && (
            <span> · Connected number: <strong>{view.phoneNumber}</strong></span>
          )}
        </p>
        {view.lastError && (
          <p style={{ color: "#b45309" }}>Last error: {view.lastError}</p>
        )}
        {error && <p style={{ color: "#b45309" }}>{error}</p>}

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          {!connected ? (
            <button type="button" disabled={busy !== null || !view.configured} onClick={() => start("connect")}>
              {busy === "connect" ? "Connecting…" : "Connect WhatsApp"}
            </button>
          ) : (
            <button type="button" disabled={busy !== null} onClick={() => start("disconnect")}>
              {busy === "disconnect" ? "Disconnecting…" : "Disconnect WhatsApp"}
            </button>
          )}
          <button type="button" disabled={busy !== null || !view.configured} onClick={() => start("reconnect")}>
            {busy === "reconnect" ? "Restarting…" : "Reconnect"}
          </button>
          {qr && (
            <button type="button" onClick={() => refresh()}>
              Check status
            </button>
          )}
        </div>

        {qr && (
          <div style={{ marginTop: "1rem" }}>
            <p>Scan this code with WhatsApp on the school phone (Linked devices → Link a device):</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`}
              alt="WhatsApp QR code"
              style={{ width: 280, height: 280, border: "1px solid #e6e9ee", borderRadius: 8 }}
            />
            <p style={{ color: "#5b6470", fontSize: "0.85rem" }}>
              The code refreshes automatically. This page will show the connected
              number once the scan succeeds.
            </p>
          </div>
        )}
      </div>

      <div style={{ border: "1px solid #e6e9ee", borderRadius: 10, padding: "1rem 1.25rem" }}>
        <h2 style={{ marginTop: 0 }}>Notification settings</h2>
        {TOGGLES.map((t) => (
          <label key={t.key} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", marginBottom: "0.8rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={view.settings[t.key]}
              onChange={(e) => toggle(t.key, e.target.checked)}
              style={{ marginTop: "0.25rem" }}
            />
            <span>
              <strong>{t.label}</strong>
              <br />
              <small style={{ color: "#5b6470" }}>{t.hint}</small>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
