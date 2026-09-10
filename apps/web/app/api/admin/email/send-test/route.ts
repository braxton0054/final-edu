import { NextResponse } from "next/server";
import { sendMail } from "@/lib/email/mailer";

// Sends a real test email through the configured provider.
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let to = "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    to = String(body.to ?? "").trim();
  } else {
    const form = await request.formData().catch(() => null);
    to = String(form?.get("to") ?? "").trim();
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ ok: false, error: "Enter a valid recipient address." }, { status: 400 });
  }
  const result = await sendMail({
    to,
    subject: "Test Email",
    html: "Test email sent successfully.",
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
