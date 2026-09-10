-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "churnReason" TEXT,
ADD COLUMN     "churnedAt" TIMESTAMP(3);
