import nodemailer from "nodemailer";
import { prisma } from "@mtanda/database";
import { decryptSecret } from "@/lib/auth/encryption";

export type SmtpConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName: string;
  secure: boolean;
};

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const row = await prisma.platformEmailSettings.findFirst({
    where: { active: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!row) return null;
  return {
    host: row.host,
    port: row.port,
    username: row.username,
    password: decryptSecret(row.passwordEnc),
    fromEmail: row.fromEmail,
    fromName: row.fromName,
    secure: row.secure,
  };
}

function transporter(cfg: SmtpConfig) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    // Port-587 submission must always upgrade to TLS, any provider.
    requireTLS: !cfg.secure,
    auth: { user: cfg.username, pass: cfg.password },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });
}

// Real connection check against the provider (AUTH + handshake).
export async function verifySmtp(): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getSmtpConfig();
  if (!cfg) return { ok: false, error: "No active email settings." };
  try {
    await transporter(cfg).verify();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: fullSmtpError(e) };
  }
}

// Nodemailer truncates server replies — include the full SMTP response
// (it usually names the real cause: bad password, IP block, etc.).
function fullSmtpError(e: unknown): string {
  if (!(e instanceof Error)) return "SMTP check failed.";
  const response = (e as { response?: unknown }).response;
  const code = (e as { responseCode?: unknown }).responseCode;
  const parts = [e.message];
  if (code !== undefined) parts.push(`code=${String(code)}`);
  if (typeof response === "string" && response && !e.message.includes(response)) {
    parts.push(`server: ${response}`);
  }
  return parts.join(" ").slice(0, 500);
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getSmtpConfig();
  if (!cfg) return { ok: false, error: "No active email settings." };
  try {
    await transporter(cfg).sendMail({
      from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: fullSmtpError(e) };
  }
}
