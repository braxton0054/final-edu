import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Reversible encryption for stored credentials (SMTP passwords, API secrets).
// NOTE: credentials MUST be encrypted (not hashed) — the app needs the
// original value back to log in to SMTP. User login passwords stay one-way
// hashed in passwords.ts.

function key(): Buffer {
  const raw = process.env.SECRETS_ENCRYPTION_KEY ?? "";
  // Accept a 64-char hex key, otherwise stretch whatever is configured.
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, "hex");
  return createHash("sha256").update(raw || "dev-only-insecure-key").digest();
}

// Format: base64(iv):base64(ciphertext):base64(authTag)
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${enc.toString("base64")}:${tag.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, encB64, tagB64] = payload.split(":");
  if (!ivB64 || !encB64 || !tagB64) throw new Error("Malformed secret payload.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return (
    decipher.update(Buffer.from(encB64, "base64"), undefined, "utf8") +
    decipher.final("utf8")
  );
}

export function isEncrypted(value: string): boolean {
  return value.split(":").length === 3;
}
