-- CreateTable
CREATE TABLE "payment_provider_configs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'sandbox',
    "credentialsEnc" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_provider_configs_provider_key" ON "payment_provider_configs"("provider");

