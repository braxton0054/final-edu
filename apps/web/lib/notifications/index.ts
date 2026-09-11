// ─── Notification layer ───
// Feature modules (fees, results, assignments, …) call `notify()` with a
// typed event. This layer resolves the audience, checks the school's
// preferences, and hands delivery to channels. The in-app inbox is the
// primary channel (system of record); WhatsApp stays available as a delivery
// channel for later.

import { prisma } from "@mtanda/database";
import { sendMessage as sendWhatsAppMessage } from "@/lib/whatsapp/service";
import {
  createConversation,
  findParentByPhone,
  type Audience,
} from "@/lib/messaging/service";

export type NotificationEvent =
  | "fee_invoice"
  | "payment_confirmation"
  | "receipt"
  | "student_registration"
  | "result_publication"
  | "assignment"
  | "announcement"
  | "parent_communication";

export type NotifyInput = {
  schoolId: string;
  event: NotificationEvent;
  to?: string; // recipient phone for the whatsapp channel
  audience?: Audience; // recipients for the inapp channel
  parentUserId?: string; // single-recipient inbox delivery
  data?: Record<string, string | number | undefined>;
  text?: string; // explicit body (parent_communication / custom messages)
  channels?: Array<"inapp" | "whatsapp">; // default: ["inapp"]
};

const EVENT_TO_PREF: Record<NotificationEvent, "notifyFees" | "notifyPayments" | "notifyResults" | "notifyAnnouncements" | null> = {
  fee_invoice: "notifyFees",
  payment_confirmation: "notifyPayments",
  receipt: "notifyPayments",
  student_registration: "notifyAnnouncements",
  result_publication: "notifyResults",
  assignment: "notifyAnnouncements",
  announcement: "notifyAnnouncements",
  parent_communication: null, // explicit sends bypass preferences
};

export function renderNotification(input: NotifyInput): string {
  if (input.text && input.text.trim()) return input.text.trim().slice(0, 4000);
  const d = input.data ?? {};
  const s = (k: string) => (d[k] === undefined ? "" : String(d[k]));
  switch (input.event) {
    case "fee_invoice":
      return (
        `Hello ${s("name")}, a fee invoice of KSh ${s("amount")} has been issued` +
        `${s("student") ? ` for ${s("student")}` : ""}` +
        `${s("term") ? ` (${s("term")})` : ""}. Reply to this chat if you need help.`
      );
    case "payment_confirmation":
      return (
        `Payment received: KSh ${s("amount")}` +
        `${s("receipt") ? ` (receipt ${s("receipt")})` : ""}` +
        `${s("student") ? ` for ${s("student")}` : ""}. Thank you.`
      );
    case "receipt":
      return (
        `Receipt${s("receipt") ? ` ${s("receipt")}` : ""}: KSh ${s("amount")} received` +
        `${s("student") ? ` for ${s("student")}` : ""}${s("balance") ? `. Balance: KSh ${s("balance")}` : ""}.`
      );
    case "student_registration":
      return (
        `Welcome${s("student") ? `, ${s("student")}` : ""}! Registration completed successfully` +
        `${s("admissionNo") ? ` (admission ${s("admissionNo")})` : ""}.`
      );
    case "result_publication":
      return (
        `Results are out${s("student") ? ` for ${s("student")}` : ""}` +
        `${s("term") ? ` (${s("term")})` : ""}. Log in to the parent portal to view the report card.`
      );
    case "assignment":
      return (
        `New assignment${s("title") ? `: ${s("title")}` : ""}` +
        `${s("student") ? ` for ${s("student")}` : ""}` +
        `${s("due") ? `. Due: ${s("due")}` : ""}.`
      );
    case "announcement":
      return `${s("school") ? `${s("school")}: ` : ""}${s("message") || s("title") || "New announcement. Check the parent portal."}`;
    case "parent_communication":
      return s("message") || "Message from the school office.";
  }
}

export async function notify(
  input: NotifyInput
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const channels = input.channels ?? ["inapp"];
  const text = renderNotification(input);

  // In-app inbox first: always the system of record.
  if (channels.includes("inapp")) {
    const inapp = await deliverInApp(input, text);
    if (!inapp.ok) return inapp;
    // WhatsApp fan-out below is additive when requested.
    if (!channels.includes("whatsapp")) return { ok: true };
  }

  if (!channels.includes("whatsapp")) return { ok: true, skipped: true, error: "No channel selected." };

  const to = (input.to ?? "").trim();
  if (!to) return { ok: false, error: "Recipient phone number is required." };

  const connection = await prisma.whatsAppConnection.findUnique({
    where: { schoolId: input.schoolId },
  });
  if (!connection) return { ok: false, skipped: true, error: "WhatsApp not connected." };
  if (connection.status !== "CONNECTED") {
    return { ok: false, skipped: true, error: "WhatsApp is not connected." };
  }

  const pref = EVENT_TO_PREF[input.event];
  if (pref && !connection[pref]) {
    return { ok: false, skipped: true, error: `Notifications for ${input.event} are disabled.` };
  }

  return sendWhatsAppMessage(input.schoolId, to, text, input.event);
}

const EVENT_TITLES: Record<NotificationEvent, string> = {
  fee_invoice: "Fee invoice",
  payment_confirmation: "Payment received",
  receipt: "Payment receipt",
  student_registration: "Welcome",
  result_publication: "Results published",
  assignment: "New assignment",
  announcement: "Announcement",
  parent_communication: "Message from school",
};

// Inbox delivery: one conversation per notification, addressed to the given
// audience (or a single parent). Posted as the school (no staff author).
async function deliverInApp(
  input: NotifyInput,
  text: string
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  let audience: Audience;
  if (input.parentUserId) {
    audience = { type: "users", userIds: [input.parentUserId] };
  } else if (input.audience) {
    audience = input.audience;
  } else if (input.to) {
    const parentId = await findParentByPhone(input.schoolId, input.to);
    if (!parentId) {
      return { ok: false, skipped: true, error: "No parent account matches this number." };
    }
    audience = { type: "users", userIds: [parentId] };
  } else {
    return { ok: false, error: "No audience: pass parentUserId, audience, or to." };
  }

  // System-authored: find any staff account to attribute, else fail loudly.
  const staff = await prisma.user.findFirst({
    where: { schoolId: input.schoolId, userType: { in: ["SCHOOL_ADMIN", "STAFF"] } },
    select: { id: true },
  });
  if (!staff) return { ok: false, error: "No staff account found for this school." };

  try {
    await createConversation({
      schoolId: input.schoolId,
      title: EVENT_TITLES[input.event],
      audience,
      firstMessage: text,
      senderId: staff.id,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Inbox delivery failed." };
  }
}

// Batch helper for announcements (one school → many parents).
export async function notifyMany(
  inputs: NotifyInput[]
): Promise<{ sent: number; skipped: number; failed: number }> {
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const input of inputs) {
    const r = await notify(input);
    if (r.ok) sent++;
    else if (r.skipped) skipped++;
    else failed++;
  }
  return { sent, skipped, failed };
}
