-- Add new SchoolStatus values in their own transaction (PG requires commit before use)
ALTER TYPE "SchoolStatus" ADD VALUE 'PENDING_VERIFICATION';
ALTER TYPE "SchoolStatus" ADD VALUE 'TRIAL';
