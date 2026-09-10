import { readFile } from "node:fs/promises";
import { join } from "node:path";
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

async function logoAttachment() {
  try {
    const content = await readFile(join(process.cwd(), "public", "logo.png"));
    return [{ filename: "logo.png", content, cid: "mtanda-logo", contentType: "image/png" }];
  } catch {
    return undefined;
  }
}

// Emailed invoice for a new subscription (trial signup included).
// Brand-styled HTML with the logo embedded (CID) so it renders in every inbox.
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
  return sendMail({
    to,
    subject: `Your MtandaoLabs invoice ${invoiceNo} — ${schoolName}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;color:#101418">
        <div style="background:#101418;border-radius:12px 12px 0 0;padding:20px 24px">
          <img src="cid:mtanda-logo" alt="MtandaoLabs" height="52" style="display:block" />
        </div>
        <div style="border:1px solid #e6e9ee;border-top:4px solid #f59e0b;border-radius:0 0 12px 12px;padding:20px 24px">
          <h2 style="margin:0 0 4px">Subscription invoice ${invoiceNo}</h2>
          <p>Hello ${schoolName},</p>
          <p>Your <strong>${planName}</strong> subscription is registered with a
          <strong>${trialDays}-day free trial</strong> ending ${trialEnd.toDateString()}.</p>
          <table style="width:100%;border-collapse:collapse" border="1" cellpadding="8">
            <tr style="background:#f7f5f1"><td>Plan (${planName}, per 3 months)</td><td align="right">${kes(amount)}</td></tr>
            <tr><td><strong>Total due</strong></td><td align="right"><strong>${kes(amount)}</strong></td></tr>
          </table>
          <p>Pay by M-Pesa any time before the trial ends to stay active:</p>
          <p><a href="${payUrl}" style="display:inline-block;background:#f59e0b;color:#101418;font-weight:700;text-decoration:none;padding:10px 22px;border-radius:999px">Continue to Payment →</a></p>
          <hr style="border:none;border-top:1px solid #e6e9ee" />
          <p><strong>MtandaoLabsEdu</strong><br />
          <a href="mailto:mtandaolabs@gmail.com">mtandaolabs@gmail.com</a><br />
          <a href="tel:+254728249135">+254 728 249135</a></p>
        </div>
      </div>`,
    attachments: await logoAttachment(),
  });
}
