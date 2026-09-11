import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { audit } from "@/lib/whatsapp/service";

// POST /api/webhooks/evolution — Evolution API event callbacks (internal).
// Evolution is never exposed publicly and only reaches this route over the
// deployment's internal network. Authentication is the shared webhook secret
// registered on every instance's webhook URL; the tenant is resolved by
// looking up the event's `instance` name in the database — never from any
// school_id the payload might carry.

type EvolutionEvent = {
  event?: string;
  instance?: string;
  data?: Record<string, unknown> | Array<Record<string, unknown>> | unknown;
};

function jidToMsisdn(jid: unknown): string | null {
  if (typeof jid !== "string") return null;
  const user = jid.split("@")[0].split(":")[0];
  const digits = user.replace(/\D/g, "");
  return digits || null;
}

export async function POST(request: Request) {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET?.trim() ?? "";
  const provided =
    new URL(request.url).searchParams.get("secret") ??
    request.headers.get("x-evolution-webhook-secret") ??
    "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as EvolutionEvent | null;
  const event = String(body?.event ?? "").toUpperCase();
  const instanceName = String(body?.instance ?? "");
  if (!event || !instanceName) {
    return NextResponse.json({ ok: true });
  }

  // Resolve the tenant strictly by instance name. Unknown instances are
  // acknowledged but ignored — a foreign instance must never resolve to a
  // school it does not own.
  const connection = await prisma.whatsAppConnection.findUnique({
    where: { instanceName },
  });
  if (!connection) return NextResponse.json({ ok: true });
  const schoolId = connection.schoolId;

  try {
    if (event === "CONNECTION_UPDATE" || event === "CONNECTION.UPDATE") {
      await handleConnectionUpdate(connection.id, schoolId, body?.data);
    } else if (event === "MESSAGES_UPSERT" || event === "MESSAGES.UPSERT") {
      await handleMessagesUpsert(connection.id, schoolId, body?.data);
    } else if (event === "MESSAGES_UPDATE" || event === "MESSAGES.UPDATE") {
      await handleMessagesUpdate(connection.id, body?.data);
    } else if (event === "SEND_MESSAGE" || event === "SEND.MESSAGE") {
      await handleSendMessage(connection.id, body?.data);
    }
    // QRCODE_UPDATED and everything else: ignored. The dashboard fetches QR on
    // demand through the authenticated SaaS backend.
  } catch (e) {
    await audit(schoolId, "whatsapp.webhook_error", {
      event,
      error: e instanceof Error ? e.message.slice(0, 200) : "error",
    });
  }
  return NextResponse.json({ ok: true });
}

async function handleConnectionUpdate(
  connectionId: string,
  schoolId: string,
  raw: EvolutionEvent["data"]
) {
  const d = (raw ?? {}) as Record<string, unknown>;
  const state = String(
    d.state ?? (d.instance as Record<string, unknown> | undefined)?.state ?? ""
  ).toLowerCase();
  const phone =
    jidToMsisdn(d.wuid) ??
    jidToMsisdn((d.instance as Record<string, unknown> | undefined)?.wuid) ??
    (typeof d.phoneNumber === "string" ? d.phoneNumber : null);

  if (state === "open") {
    await prisma.whatsAppConnection.update({
      where: { id: connectionId },
      data: {
        status: "CONNECTED",
        phoneNumber: phone,
        lastError: null,
        connectedAt: new Date(),
      },
    });
    await audit(schoolId, "whatsapp.connected", { phone: phone ?? null });
  } else if (state === "connecting") {
    await prisma.whatsAppConnection.update({
      where: { id: connectionId },
      data: { status: "CONNECTING" },
    });
  } else if (state === "close") {
    await prisma.whatsAppConnection.update({
      where: { id: connectionId },
      data: {
        status: "DISCONNECTED",
        connectedAt: null,
        lastError:
          typeof d.statusReason === "string"
            ? d.statusReason.slice(0, 200)
            : "Session closed on the device.",
      },
    });
    await audit(schoolId, "whatsapp.disconnected", {
      reason: typeof d.statusReason === "string" ? d.statusReason : null,
    });
  }
}

function extractText(message: unknown): string | null {
  if (!message || typeof message !== "object") return null;
  const m = message as Record<string, unknown>;
  const conv = m.conversation;
  if (typeof conv === "string") return conv.slice(0, 4000);
  const ext = m.extendedTextMessage as Record<string, unknown> | undefined;
  if (ext && typeof ext.text === "string") return ext.text.slice(0, 4000);
  return null;
}

async function handleMessagesUpsert(
  connectionId: string,
  schoolId: string,
  raw: EvolutionEvent["data"]
) {
  const d = (raw ?? {}) as Record<string, unknown>;
  const key = (d.key ?? {}) as Record<string, unknown>;
  const fromMe = key.fromMe === true;
  const remoteJid = jidToMsisdn(key.remoteJid);
  const messageId = typeof key.id === "string" ? key.id : null;
  const text = extractText(d.message);

  if (fromMe) {
    // Echo of our own send — just promote the matching outbound row.
    if (messageId) {
      await prisma.whatsAppMessage.updateMany({
        where: { connectionId, evolutionId: messageId },
        data: { status: "SENT" },
      });
    }
    return;
  }

  await prisma.whatsAppMessage.create({
    data: {
      schoolId,
      connectionId,
      direction: "inbound",
      from: remoteJid,
      body: text,
      category: typeof d.messageType === "string" ? d.messageType : null,
      status: "RECEIVED",
      evolutionId: messageId,
    },
  });
  await audit(schoolId, "whatsapp.message_received", {
    from: remoteJid ? `***${remoteJid.slice(-3)}` : null,
  });
}

async function handleMessagesUpdate(
  connectionId: string,
  raw: EvolutionEvent["data"]
) {
  const items = Array.isArray(raw) ? raw : [raw as Record<string, unknown>];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const key = ((item as Record<string, unknown>).key ?? {}) as Record<string, unknown>;
    const update = ((item as Record<string, unknown>).update ?? {}) as Record<string, unknown>;
    const messageId = typeof key.id === "string" ? key.id : null;
    const status = String(update.status ?? "").toUpperCase();
    if (!messageId) continue;
    // Evolution: 1=sent, 2=delivered, 3/4=read/played.
    const mapped =
      status === "READ" || status === "3" || status === "4"
        ? "READ"
        : status === "DELIVERY_ACK" || status === "DELIVERED" || status === "2"
          ? "DELIVERED"
          : status === "SERVER_ACK" || status === "1"
            ? "SENT"
            : null;
    if (!mapped) continue;
    await prisma.whatsAppMessage.updateMany({
      where: { connectionId, evolutionId: messageId },
      data: { status: mapped },
    });
  }
}

async function handleSendMessage(
  connectionId: string,
  raw: EvolutionEvent["data"]
) {
  const d = (raw ?? {}) as Record<string, unknown>;
  const key = (d.key ?? {}) as Record<string, unknown>;
  const messageId = typeof key.id === "string" ? key.id : null;
  if (!messageId) return;
  // Tie-breaker: if our send log hasn't recorded the provider id yet, attach it.
  await prisma.whatsAppMessage.updateMany({
    where: { connectionId, direction: "outbound", evolutionId: null },
    data: { evolutionId: messageId, status: "SENT" },
  });
}
