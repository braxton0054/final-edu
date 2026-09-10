-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "parentMonthlyFee" DECIMAL(12,2) NOT NULL DEFAULT 300;

-- AlterTable
ALTER TABLE "subscription_plans" DROP COLUMN "parentMonthlyFee";
