-- AlterTable
ALTER TABLE "announcements" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable  
ALTER TABLE "assessment_questions" RENAME COLUMN "step" TO "order";
ALTER TABLE "assessment_questions" RENAME COLUMN "question" TO "label";
ALTER TABLE "assessment_questions" RENAME COLUMN "questionType" TO "type";
ALTER TABLE "assessment_questions" ADD COLUMN "key" TEXT;
ALTER TABLE "assessment_questions" ADD COLUMN "section" TEXT DEFAULT '';
ALTER TABLE "assessment_questions" ADD COLUMN "placeholder" TEXT;
ALTER TABLE "assessment_questions" DROP COLUMN "isRequired";

-- CreateIndex
CREATE UNIQUE INDEX "assessment_questions_key_key" ON "assessment_questions"("key");
