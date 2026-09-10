-- AlterTable
ALTER TABLE "schools" ADD COLUMN     "academicYear" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "authorizedConfirm" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "county" TEXT,
ADD COLUMN     "currentTerm" TEXT,
ADD COLUMN     "curriculum" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "estimatedClasses" INTEGER,
ADD COLUMN     "estimatedStudents" INTEGER,
ADD COLUMN     "estimatedTeachers" INTEGER,
ADD COLUMN     "knecCode" TEXT,
ADD COLUMN     "kraPin" TEXT,
ADD COLUMN     "levelsOffered" JSONB,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "motto" TEXT,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ownership" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "postalAddress" TEXT,
ADD COLUMN     "primaryColor" TEXT,
ADD COLUMN     "privacyVersion" TEXT,
ADD COLUMN     "regNumber" TEXT,
ADD COLUMN     "schoolType" TEXT,
ADD COLUMN     "secondaryColor" TEXT,
ADD COLUMN     "shortName" TEXT,
ADD COLUMN     "subCounty" TEXT,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsAcceptedBy" TEXT,
ADD COLUMN     "termsAcceptedIp" TEXT,
ADD COLUMN     "termsVersion" TEXT,
ADD COLUMN     "town" TEXT,
ADD COLUMN     "ward" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "email_verification_tokens" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_verification_tokens_token_key" ON "email_verification_tokens"("token");

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

