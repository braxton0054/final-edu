// ─── Evolution API client (INTERNAL ONLY) ───
// Evolution runs as an internal service of this deployment (see
// docker-compose.yml) and is never exposed publicly. Only the SaaS backend may
// call it; the master API key and per-instance tokens never reach the browser.

const EVOLUTION_TIMEOUT_MS = 20_000;

export type EvolutionConfig = {
  baseUrl: string;
  apiKey: string;
};

// Master credentials come from the environment only. No hard-coded secrets.
export function evolutionConfig(): EvolutionConfig | null {
  const baseUrl = process.env.EVOLUTION_API_URL?.trim();
  const apiKey = process.env.EVOLUTION_API_KEY?.trim();
  if (!baseUrl || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

export function evolutionConfigured(): boolean {
  return evolutionConfig() !== null;
}

// Public URL the Evolution container should call back to reach this Next.js
// app. From inside the container, 127.0.0.1 means the container itself, so
// the host is always addressed via host.docker.internal (wired in both
// compose files). The port follows this process's PORT (dev :3000, VPS
// systemd :8093); set EVOLUTION_WEBHOOK_URL explicitly to override.
export function webhookBaseUrl(): string {
  const fromEnv = process.env.EVOLUTION_WEBHOOK_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  const port = process.env.PORT?.trim() || "3000";
  return `http://host.docker.internal:${port}`;
}

// Webhook endpoint Evolution calls. Carries the shared secret as a query
// parameter (server-to-server only, same pattern as the CRON_SECRET guard) so
// the handler can authenticate callbacks without trusting payload contents.
export function webhookUrl(): string | null {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET?.trim();
  if (!secret) return null;
  return `${webhookBaseUrl()}/api/webhooks/evolution?secret=${encodeURIComponent(secret)}`;
}

async function call(
  path: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: unknown; error?: string }> {
  const cfg = evolutionConfig();
  if (!cfg) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: "WhatsApp service is not configured.",
    };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EVOLUTION_TIMEOUT_MS);
  try {
    const res = await fetch(`${cfg.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.apiKey,
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
      cache: "no-store",
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data,
        error: `Evolution API HTTP ${res.status}`,
      };
    }
    return { ok: true, status: res.status, data };
  } catch (e) {
    const message =
      e instanceof Error && e.name === "AbortError"
        ? "WhatsApp service timed out."
        : e instanceof Error
          ? e.message
          : "WhatsApp service unreachable.";
    return { ok: false, status: 0, data: null, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

export type EvolutionCreateResult = {
  instanceId?: string;
  token?: string;
  qrcode?: string; // base64 data URL when available
  pairingCode?: string;
};

// Create an instance and request a QR code in one call. Evolution returns the
// QR differently per version; we normalise the useful bits here.
export async function createInstance(
  instanceName: string
): Promise<{ ok: boolean; data?: EvolutionCreateResult; error?: string }> {
  const hook = webhookUrl();
  const res = await call("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      // Webhook is registered per instance so every event identifies its school.
      // When no webhook secret is configured we skip registration rather than
      // register an unauthenticated callback URL.
      ...(hook
        ? {
            webhook: {
              url: hook,
              byEvents: false,
              base64: true,
              events: [
                "QRCODE_UPDATED",
                "CONNECTION_UPDATE",
                "MESSAGES_UPSERT",
                "MESSAGES_UPDATE",
                "SEND_MESSAGE",
              ],
            },
          }
        : {}),
    }),
  });
  if (!res.ok) return { ok: false, error: res.error };
  const d = (res.data ?? {}) as Record<string, unknown>;
  const qr = (d.qrcode ?? d.qr) as Record<string, unknown> | string | undefined;
  const qrcode =
    typeof qr === "string"
      ? qr
      : qr && typeof qr === "object"
        ? ((qr.base64 as string) ?? undefined)
        : undefined;
  return {
    ok: true,
    data: {
      instanceId: (d.instanceId as string) ?? (d.instance as Record<string, unknown> | undefined)?.instanceId as string | undefined,
      token: (d.hash as string) ?? (d.token as string) ?? (d.apikey as string) ?? undefined,
      qrcode,
      pairingCode: (d.pairingCode as string) ?? undefined,
    },
  };
}

export async function connectInstance(
  instanceName: string
): Promise<{ ok: boolean; data?: EvolutionCreateResult; error?: string }> {
  const res = await call(`/instance/connect/${encodeURIComponent(instanceName)}`, {
    method: "GET",
  });
  if (!res.ok) return { ok: false, error: res.error };
  const d = (res.data ?? {}) as Record<string, unknown>;
  const qr = (d.qrcode ?? d.base64) as string | undefined;
  return {
    ok: true,
    data: {
      qrcode: typeof d.base64 === "string" ? d.base64 : qr,
      pairingCode: (d.pairingCode as string) ?? undefined,
    },
  };
}

export type EvolutionConnectionState = {
  state: "open" | "connecting" | "close" | "unknown";
  phoneNumber?: string;
  instanceId?: string;
};

export async function getConnectionState(
  instanceName: string
): Promise<{ ok: boolean; data?: EvolutionConnectionState; error?: string }> {
  const res = await call(
    `/instance/connectionState/${encodeURIComponent(instanceName)}`,
    { method: "GET" }
  );
  if (!res.ok) return { ok: false, error: res.error };
  const d = (res.data ?? {}) as Record<string, unknown>;
  const instance = (d.instance ?? {}) as Record<string, unknown>;
  const raw = String(instance.state ?? d.state ?? "unknown");
  const state =
    raw === "open" || raw === "connecting" || raw === "close"
      ? raw
      : "unknown";
  return {
    ok: true,
    data: {
      state,
      phoneNumber: (instance.phoneNumber as string) ?? undefined,
      instanceId: (instance.instanceId as string) ?? undefined,
    },
  };
}

export async function deleteInstance(
  instanceName: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await call(`/instance/delete/${encodeURIComponent(instanceName)}`, {
    method: "DELETE",
  });
  // A missing instance is effectively deleted — treat 404 as success.
  if (!res.ok && res.status !== 404) return { ok: false, error: res.error };
  return { ok: true };
}

export async function logoutInstance(
  instanceName: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await call(`/instance/logout/${encodeURIComponent(instanceName)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) return { ok: false, error: res.error };
  return { ok: true };
}

export async function sendText(
  instanceName: string,
  to: string,
  text: string
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const res = await call(`/message/sendText/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    body: JSON.stringify({ number: to, text, textMessage: { text } }),
  });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, data: res.data };
}

// (Re)register the authenticated webhook on an existing instance. Best
// effort: a missing webhook only means live event updates, never breakage.
export async function setWebhook(
  instanceName: string
): Promise<{ ok: boolean; error?: string }> {
  const hook = webhookUrl();
  if (!hook) return { ok: false, error: "EVOLUTION_WEBHOOK_SECRET is not set." };
  const res = await call(`/webhook/set/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    body: JSON.stringify({
      webhook: {
        enabled: true,
        url: hook,
        byEvents: false,
        base64: true,
        events: [
          "QRCODE_UPDATED",
          "CONNECTION_UPDATE",
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "SEND_MESSAGE",
        ],
      },
    }),
  });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true };
}

// Rescue QR for an existing instance whose first QR expired.
export async function restartInstance(
  instanceName: string
): Promise<{ ok: boolean; error?: string }> {
  const res = await call(`/instance/restart/${encodeURIComponent(instanceName)}`, {
    method: "POST",
  });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true };
}