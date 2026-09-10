// Shared branded wrapper for platform emails (OTP, resets, reminders).
// Ink header, orange accents, contact footer — matches the invoice design.

export function brandedEmail(title: string, body: string): string {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:560px;color:#101418">
      <div style="background:#101418;border-radius:12px 12px 0 0;padding:20px 24px">
        <div style="color:#ffffff;font-weight:800;font-size:1.2rem">MTANDAOLABS</div>
      </div>
      <div style="border:1px solid #e6e9ee;border-top:4px solid #f59e0b;border-radius:0 0 12px 12px;padding:20px 24px">
        <h2 style="margin:0 0 4px">${title}</h2>
        ${body}
        <hr style="border:none;border-top:1px solid #e6e9ee" />
        <p><strong>MtandaoLabsEdu</strong><br />
        <a href="mailto:mtandaolabs@gmail.com">mtandaolabs@gmail.com</a><br />
        <a href="tel:+254728249135">+254 728 249135</a></p>
      </div>
    </div>`;
}

export function otpCodeBlock(code: string): string {
  return `<p style="font-size:2rem;font-weight:800;letter-spacing:0.4rem;text-align:center;background:#f7f5f1;border-radius:10px;padding:14px">${code}</p>`;
}
