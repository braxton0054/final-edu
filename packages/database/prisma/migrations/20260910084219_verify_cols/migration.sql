-- Add verification tracking columns (schema already expects them)
ALTER TABLE "platform_email_settings" ADD COLUMN IF NOT EXISTS "lastVerifiedAt" TIMESTAMPTZ(3);
ALTER TABLE "platform_email_settings" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
ALTER TABLE "payment_provider_configs" ADD COLUMN IF NOT EXISTS "lastVerifiedAt" TIMESTAMPTZ(3);
ALTER TABLE "payment_provider_configs" ADD COLUMN IF NOT EXISTS "lastError" TEXT;
