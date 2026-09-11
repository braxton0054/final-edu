"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { timeAgo } from "./MessagesClient";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderName: string;
  senderType: string;
};

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  return (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    ok?: boolean;
  };
}

// Thread view with reply box. Polls for new messages; marks read on open.
export default function ThreadClient({
  conversationId,
  backHref,
}: {
  conversationId: string;
  backHref: string;
}) {
  const [title, setTitle] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const bottom = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(async () => {
    const data = await api(`/api/messages/conversations/${conversationId}/messages`);
    if (!data.ok) {
      setMissing(true);
      return;
    }
    const conv = data.conversation as { title?: string } | undefined;
    if (conv?.title) setTitle(conv.title);
    if (Array.isArray(data.messages)) setMessages(data.messages as Message[]);
    await api(`/api/messages/conversations/${conversationId}/read`, { method: "POST" }).catch(
      () => null
    );
  }, [conversationId]);

  useEffect(() => {
    // Timer callbacks (not the effect body) own the fetch + setState, so the
    // initial load stays out of the synchronous effect pass.
    const tick = () => void refresh();
    const t0 = setTimeout(tick, 0);
    const t1 = setInterval(tick, 5000);
    return () => {
      clearTimeout(t0);
      clearInterval(t1);
    };
  }, [refresh]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    const data = await api(`/api/messages/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text: trimmed }),
    });
    setBusy(false);
    if (!data.ok) {
      setError(String(data.error ?? "Could not send."));
      return;
    }
    setText("");
    void refresh();
  }

  if (missing) {
    return (
      <div>
        <Link href={backHref}>← Back</Link>
        <p>Conversation not found.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <Link href={backHref}>← Back</Link>
      <h1 style={{ marginBottom: "0.25rem" }}>{title || "Conversation"}</h1>
      <div
        style={{
          border: "1px solid #e6e9ee",
          borderRadius: 10,
          padding: "1rem",
          display: "grid",
          gap: "0.6rem",
          margin: "1rem 0",
          maxHeight: 480,
          overflowY: "auto",
        }}
      >
        {messages.length === 0 ? (
          <p style={{ color: "#5b6470" }}>No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              style={{
                border: "1px solid #eef0f3",
                background: m.senderType === "PARENT" ? "#f8fafc" : "#fffbeb",
                borderRadius: 8,
                padding: "0.6rem 0.8rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                <strong style={{ fontSize: "0.85rem" }}>{m.senderName}</strong>
                <small style={{ color: "#5b6470" }}>{timeAgo(m.createdAt)}</small>
              </div>
              <p style={{ margin: "0.3rem 0 0", whiteSpace: "pre-wrap" }}>{m.body}</p>
            </div>
          ))
        )}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} style={{ display: "flex", gap: "0.6rem" }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a reply…"
          maxLength={4000}
          style={{ flex: 1, padding: "0.6rem", borderRadius: 8, border: "1px solid #ccc" }}
        />
        <button type="submit" disabled={busy || !text.trim()}>
          {busy ? "…" : "Send"}
        </button>
      </form>
      {error && <p style={{ color: "#b45309" }}>{error}</p>}
    </div>
  );
}
