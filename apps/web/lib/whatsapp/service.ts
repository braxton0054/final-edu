import { prisma, type WhatsAppConnection } from "@mtanda/database";
import { encryptSecret, decryptSecret } from "@/lib/auth/encryption";
import {
  createInstance,
  connectInstance,
  getConnectionState,
  deleteInstance,
  logoutInstance,
  sendText,
  restartInstance,
  setWebhook,
  evolutionConfigured,
} from "./evolution";

// ─── WhatsApp service (tenant-scoped) ───
// All Evolution access goes through here. Callers pass an explicit schoolId
// that has already been verified by the caller's auth layer; the service never
// reads school identity from request input.

// Deterministic, provider-safe instance name. Never derived from user input.
export function instanceNameFor(schoolId: string): string {
  const safe = schoolId.replace(/[^a-zA-Z0-9_]/g, "_");
  return `school_${safe}`;
}

export type WhatsAppView = {
  configured: boolean;
  status: WhatsAppConnection["status"];
  instanceName: string | null;
  phoneNumber: string | null;
  lastError: string | null;
  connectedAt: string | null;
  settings: {
    notifyFees: boolean;
    notifyPayments: boolean;
    notifyResults: boolean;
    notifyAnnouncements: boolean;
  };
};

function toView(
  connection: WhatsAppConnection | null,
  configured: boolean
): WhatsAppView {
  return {
    configured,
    status: connection?.status ?? "DISCONNECTED",
    instanceName: connection?.instanceName ?? null,
    phoneNumber: connection?.phoneNumber ?? null,
    lastError: connection?.lastError ?? null,
    connectedAt: connection?.connectedAt?.toISOString() ?? null,
    settings: {
      notifyFees: connection?.notifyFees ?? true,
      notifyPayments: connection?.notifyPayments ?? true,
      notifyResults: connection?.notifyResults ?? true,
      notifyAnnouncements: connection?.notifyAnnouncements ?? true,
    },
  };
}

export async function getConnection(
  schoolId: string
): Promise<WhatsAppConnection | null> {
  return prisma.whatsAppConnection.findUnique({ where: { schoolId } });
}

export async function getStatus(schoolId: string): Promise<WhatsAppView> {
  const connection = await getConnection(schoolId);
  return toView(connection, evolutionConfigured());
}

export type QrResult = {
  ok: boolean;
  qrcode?: string; // data URL / base64
  pairingCode?: string;
  status: WhatsAppConnection["status"];
  error?: string;
};

// Create-or-reconnect the school's instance and return a fresh QR code.
export async function connect(schoolId: string): Promise<QrResult> {
  if (!evolutionConfigured()) {
    return {
      ok: false,
      status: "ERROR",
      error:
        "WhatsApp is not available right now. Please try again later or contact support.",
    };
  }

  const instanceName = instanceNameFor(schoolId);
  let connection = await getConnection(schoolId);

  // First time: create the instance (Evolution generates the QR).
  if (!connection) {
    const created = await createInstance(instanceName);
    if (!created.ok || !created.data) {
      return { ok: false, status: "ERROR", error: created.error };
    }
    connection = await prisma.whatsAppConnection.create({
      data: {
        schoolId,
        instanceName,
        instanceId: created.data.instanceId ?? null,
        tokenEnc: created.data.token
          ? encryptSecret(created.data.token)
          : null,
        status: created.data.qrcode ? "CONNECTING" : "DISCONNECTED",
      },
    });
    if (created.data.qrcode) {
      await audit(schoolId, "whatsapp.instance_created", { instanceName });
      return {
        ok: true,
        qrcode: created.data.qrcode,
        pairingCode: created.data.pairingCode,
        status: "CONNECTING",
      };
    }
  }

  // Existing instance (or create returned no QR): ask for a fresh QR.
  // Best-effort re-register the authenticated webhook so events keep flowing.
  await setWebhook(instanceName).catch(() => null);
  const connected = await connectInstance(instanceName);
  if (!connected.ok || !connected.data) {
    await markError(schoolId, connected.error);
    return { ok: false, status: "ERROR", error: connected.error };
  }

  await prisma.whatsAppConnection.update({
    where: { schoolId },
    data: {
      status: "CONNECTING",
      lastError: null,
      ...(connected.data.instanceId ? { instanceId: connected.data.instanceId } : {}),
    },
  });
  await audit(schoolId, "whatsapp.connect_requested", { instanceName });
  return {
    ok: true,
    qrcode: connected.data.qrcode,
    pairingCode: connected.data.pairingCode,
    status: "CONNECTING",
  };
}

// Live-refresh status from Evolution and persist it. Used by the dashboard poll.
export async function refreshStatus(schoolId: string): Promise<WhatsAppView> {
  const connection = await getConnection(schoolId);
  if (!connection) return toView(null, evolutionConfigured());
  if (!evolutionConfigured()) return toView(connection, false);

  const state = await getConnectionState(connection.instanceName);
  if (!state.ok || !state.data) {
    // Don't clobber a healthy connection on a transient probe failure.
    return toView(connection, true);
  }

  const status =
    state.data.state === "open"
      ? "CONNECTED"
      : state.data.state === "connecting"
        ? "CONNECTING"
        : "DISCONNECTED";

  if (
    status !== connection.status ||
    (state.data.phoneNumber && state.data.phoneNumber !== connection.phoneNumber)
  ) {
    const updated = await prisma.whatsAppConnection.update({
      where: { schoolId },
      data: {
        status,
        phoneNumber: state.data.phoneNumber ?? connection.phoneNumber,
        connectedAt:
          status === "CONNECTED"
            ? (connection.connectedAt ?? new Date())
            : connection.connectedAt,
        lastError: status === "CONNECTED" ? null : connection.lastError,
      },
    });
    return toView(updated, true);
  }
  return toView(connection, true);
}

export async function disconnect(schoolId: string): Promise<{ ok: boolean; error?: string }> {
  const connection = await getConnection(schoolId);
  if (!connection) return { ok: true };
  if (!evolutionConfigured()) {
    return { ok: false, error: "WhatsApp is not available right now. Please try again later." };
  }
  const out = await logoutInstance(connection.instanceName);
  if (!out.ok) return { ok: false, error: out.error };
  await prisma.whatsAppConnection.update({
    where: { schoolId },
    data: { status: "DISCONNECTED", connectedAt: null, lastError: null },
  });
  await audit(schoolId, "whatsapp.disconnected", {
    instanceName: connection.instanceName,
  });
  return { ok: true };
}

// Removes the Evolution instance entirely (used when a school deletes WhatsApp).
export async function remove(schoolId: string): Promise<{ ok: boolean; error?: string }> {
  const connection = await getConnection(schoolId);
  if (!connection) return { ok: true };
  if (evolutionConfigured()) {
    await deleteInstance(connection.instanceName);
  }
  await prisma.whatsAppConnection.delete({ where: { schoolId } });
  await audit(schoolId, "whatsapp.removed", {
    instanceName: connection.instanceName,
  });
  return { ok: true };
}

export async function restart(schoolId: string): Promise<QrResult> {
  const connection = await getConnection(schoolId);
  if (!connection) return connect(schoolId);
  if (!evolutionConfigured()) {
    return { ok: false, status: "ERROR", error: "WhatsApp is not available right now. Please try again later." };
  }
  const r = await restartInstance(connection.instanceName);
  if (!r.ok) return { ok: false, status: "ERROR", error: r.error };
  return connect(schoolId);
}

export async function updateSettings(
  schoolId: string,
  settings: Partial<{
    notifyFees: boolean;
    notifyPayments: boolean;
    notifyResults: boolean;
    notifyAnnouncements: boolean;
  }>
): Promise<WhatsAppView> {
  await prisma.whatsAppConnection.upsert({
    where: { schoolId },
    update: { ...settings },
    create: { schoolId, instanceName: instanceNameFor(schoolId), ...settings },
  });
  const connection = await getConnection(schoolId);
  return toView(connection, evolutionConfigured());
}

// Low-level send used by the notification layer. Enforces that the school is
// actually connected before attempting delivery, and logs the attempt.
export async function sendMessage(
  schoolId: string,
  to: string,
  text: string,
  category?: string
): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const connection = await getConnection(schoolId);
  if (!connection) {
    return { ok: false, error: "WhatsApp is not connected for this school." };
  }
  if (connection.status !== "CONNECTED") {
    return {
      ok: false,
      error: "WhatsApp is not connected. Reconnect it from Settings → WhatsApp.",
    };
  }
  if (!evolutionConfigured()) {
    return { ok: false, error: "WhatsApp is not available right now. Please try again later." };
  }

  const number = normaliseMsisdn(to);
  const logged = await prisma.whatsAppMessage.create({
    data: {
      schoolId,
      connectionId: connection.id,
      direction: "outbound",
      to: number,
      body: text.slice(0, 4000),
      category: category ?? null,
      status: "PENDING",
    },
  });

  const out = await sendText(connection.instanceName, number, text);
  if (!out.ok) {
    await prisma.whatsAppMessage.update({
      where: { id: logged.id },
      data: { status: "FAILED", error: out.error?.slice(0, 300) },
    });
    return { ok: false, error: out.error, messageId: logged.id };
  }

  const evolutionId = extractMessageId(out.data);
  await prisma.whatsAppMessage.update({
    where: { id: logged.id },
    data: { status: "SENT", evolutionId },
  });
  return { ok: true, messageId: logged.id };
}

// Kenya-friendly MSISDN normalisation (mirrors the payments module).
export function normaliseMsisdn(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("254")) return d;
  if (d.startsWith("0")) return `254${d.slice(1)}`;
  if (d.startsWith("7") || d.startsWith("1")) return `254${d}`;
  return d;
}

function extractMessageId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const key = (d.key ?? {}) as Record<string, unknown>;
  return (key.id as string) ?? (d.id as string) ?? null;
}

export async function markError(schoolId: string, error?: string): Promise<void> {
  await prisma.whatsAppConnection.updateMany({
    where: { schoolId },
    data: {
      status: "ERROR",
      lastError: (error ?? "Unknown error").slice(0, 300),
    },
  });
}

export async function audit(
  schoolId: string,
  action: string,
  metadata?: Record<string, string | number | boolean | null>
): Promise<void> {
  await prisma.auditLog.create({
    data: { schoolId, action, metadata: metadata ?? undefined },
  });
}

// Decrypt helper kept here so token material never crosses module boundaries.
export function instanceToken(connection: WhatsAppConnection): string | null {
  return connection.tokenEnc ? decryptSecret(connection.tokenEnc) : null;
}
