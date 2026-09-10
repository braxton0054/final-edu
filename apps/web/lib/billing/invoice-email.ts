import { prisma } from "@mtanda/database";
import { sendMail } from "@/lib/email/mailer";

export async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.platformInvoice.count({
    where: { number: { startsWith: `ML-${year}-` } },
  });
  return `ML-${year}-${String(count + 1).padStart(4, "0")}`;
}

function kes(n: number): string {
  return `KSh ${n.toLocaleString()}`;
}

// Emailed invoice for a new subscription (trial signup included).
// Plain HTML email — no PDF dependency, renders everywhere.
export async function sendSubscriptionInvoice(opts: {
  to: string;
  schoolName: string;
  invoiceNo: string;
  planName: string;
  amount: number;
  trialDays: number;
  trialEnd: Date;
  payUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { to, schoolName, invoiceNo, planName, amount, trialDays, trialEnd, payUrl } = opts;
  const logo = `${new URL(payUrl).origin}/logo.png`;
  return sendMail({
    to,
    subject: `Your MtandaoLabs invoice ${invoiceNo} — ${schoolName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px">
        <img src="${logo}" alt="MtandaoLabs" height="56" style="display:block;margin-bottom:12px" />
        <h2>Subscription invoice ${invoiceNo}</h2>
        <p>Hello ${schoolName},</p>
        <p>Your <strong>${planName}</strong> subscription is registered with a
        <strong>${trialDays}-day free trial</strong> ending ${trialEnd.toDateString()}.</p>
        <table style="width:100%;border-collapse:collapse" border="1" cellpadding="8">
          <tr><td>Plan (${planName}, per 3 months)</td><td align="right">${kes(amount)}</td></tr>
          <tr><td><strong>Total due</strong></td><td align="right"><strong>${kes(amount)}</strong></td></tr>
        </table>
        <p>Pay by M-Pesa any time before the trial ends to stay active:</p>
        <p><a href="${payUrl}">Continue to Payment →</a></p>
        <hr style="border:none;border-top:1px solid #ddd" />
        <p><strong>MtandaoLabsEdu</strong><br />
        <a href="mailto:mtandaolabs@gmail.com">mtandaolabs@gmail.com</a><br />
        <a href="tel:+254728249135">+254 728 249135</a></p>
      </div>`,
  });
}
