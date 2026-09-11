"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

export type ConversationSummary = {
  id: string;
  title: string;
  audience: string;
  audienceRef: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  lastSenderName: string | null;
  unread: number;
  memberCount: number;
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

export function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

// Inbox list. Staff also get the compose form; parents get a read-only list.
export default function MessagesClient({
  classIds,
  basePath,
  canCompose,
  audienceOptions,
}: {
  classIds: string[];
  basePath: string;
  canCompose: boolean;
  audienceOptions?: Array<"all_parents" | "class">;
}) {
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const options = audienceOptions ?? ["all_parents", "class"];
  const [audience, setAudience] = useState<string>(
    options.includes("all_parents") ? "all_parents" : "class"
  );
  const [classId, setClassId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const refresh = useCallback(async () => {
    const data = await api("/api/messages/conversations");
    if (data.ok && Array.isArray(data.conversations)) {
      setItems(data.conversations as ConversationSummary[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Timer callbacks (not the effect body) own the fetch + setState, so the
    // initial load stays out of the synchronous effect pass.
    const tick = () => void refresh();
    const t0 = setTimeout(tick, 0);
    const t1 = setInterval(tick, 15000);
    return () => {
      clearTimeout(t0);
      clearInterval(t1);
    };
  }, [refresh]);

  async function compose(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSent(false);
    const data = await api("/api/messages/conversations", {
      method: "POST",
      body: JSON.stringify({ title, text, audience, classId }),
    });
    setBusy(false);
    if (!data.ok) {
      setError(String(data.error ?? "Could not send."));
      return;
    }
    setTitle("");
    setText("");
    setSent(true);
    void refresh();
  }

  return (
    <div style={{ display: "grid", gap: "1.25rem", maxWidth: 720 }}>
      {canCompose && (
        <form
          onSubmit={compose}
          style={{ border: "1px solid #e6e9ee", borderRadius: 10, padding: "1rem 1.25rem" }}
        >
          <h2 style={{ marginTop: 0 }}>New message</h2>
          <div style={{ display: "grid", gap: "0.7rem" }}>
            <label>
              Subject
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="e.g. Term 2 fee reminders"
                style={{ display: "block", width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #ccc" }}
              />
            </label>
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <label>
                Audience
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  style={{ display: "block", padding: "0.6rem", borderRadius: 8, border: "1px solid #ccc" }}
                >
                  {options.includes("all_parents") && (
                    <option value="all_parents">All parents</option>
                  )}
                  {options.includes("class") && <option value="class">One class</option>}
                </select>
              </label>
              {audience === "class" && (
                <label>
                  Class
                  <input
                    required
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    list="msg-classes"
                    placeholder="e.g. Grade 5"
                    style={{ display: "block", padding: "0.6rem", borderRadius: 8, border: "1px solid #ccc" }}
                  />
                  <datalist id="msg-classes">
                    {classIds.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </label>
              )}
            </div>
            <label>
              Message
              <textarea
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="Write the message parents will see…"
                style={{ display: "block", width: "100%", padding: "0.6rem", borderRadius: 8, border: "1px solid #ccc" }}
              />
            </label>
            {error && <p style={{ color: "#b45309", margin: 0 }}>{error}</p>}
            {sent && <p style={{ color: "#15803d", margin: 0 }}>Sent.</p>}
            <div>
              <button type="submit" disabled={busy}>
                {busy ? "Sending…" : "Send to parents"}
              </button>
            </div>
          </div>
        </form>
      )}

      <div>
        <h2>Inbox</h2>
        {loading ? (
          <p style={{ color: "#5b6470" }}>Loading…</p>
        ) : items.length === 0 ? (
          <p style={{ color: "#5b6470" }}>No conversations yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: "0.6rem" }}>
            {items.map((c) => (
              <li key={c.id} style={{ border: "1px solid #e6e9ee", borderRadius: 10, padding: "0.8rem 1rem" }}>
                <Link href={`${basePath}/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "baseline" }}>
                    <strong>
                      {c.unread > 0 && (
                        <span
                          style={{
                            display: "inline-block",
                            background: "#f59e0b",
                            color: "#101418",
                            borderRadius: 999,
                            fontSize: "0.72rem",
                            padding: "0.05rem 0.45rem",
                            marginRight: "0.45rem",
                          }}
                        >
                          {c.unread} new
                        </span>
                      )}
                      {c.title}
                    </strong>
                    <small style={{ color: "#5b6470", whiteSpace: "nowrap" }}>{timeAgo(c.lastMessageAt)}</small>
                  </div>
                  {c.lastMessagePreview && (
                    <p style={{ margin: "0.35rem 0 0", color: "#374151" }}>
                      {c.lastSenderName ? `${c.lastSenderName}: ` : ""}
                      {c.lastMessagePreview}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
