-- AlterTable (backfill-safe: existing rows get a generated number)
ALTER TABLE "platform_invoices" ADD COLUMN     "number" TEXT;

UPDATE "platform_invoices" SET "number" = 'INV-' || LEFT("id", 8) WHERE "number" IS NULL;

ALTER TABLE "platform_invoices" ALTER COLUMN "number" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "platform_invoices_number_key" ON "platform_invoices"("number");
