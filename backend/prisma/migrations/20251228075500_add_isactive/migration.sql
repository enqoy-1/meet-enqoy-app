-- AlterTable
ALTER TABLE "assessment_questions" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
