// ─── Notification layer ───
// Feature modules (fees, results, assignments, …) call `notify()` with a
// typed event. This layer resolves the recipient, checks the school's
// preferences, renders a message, and hands delivery to a channel provider.
// Evolution API is only ever touched by lib/whatsapp — never from here.

import { prisma } from "@mtanda/database";
import { sendMessage as sendWhatsAppMessage } from "@/lib/whatsapp/service";

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
  to: string; // recipient phone in any common format
  data?: Record<string, string | number | undefined>;
  text?: string; // explicit body (parent_communication / custom messages)
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
  const to = input.to.trim();
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

  const text = renderNotification(input);
  return sendWhatsAppMessage(input.schoolId, to, text, input.event);
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
