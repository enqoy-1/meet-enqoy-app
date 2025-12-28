/*
  Warnings:

  - A unique constraint covering the columns `[userId,eventId]` on the table `pairing_guests` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "pairing_guests" ADD COLUMN     "personality" JSONB,
ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "pairing_guests_userId_eventId_key" ON "pairing_guests"("userId", "eventId");

-- AddForeignKey
ALTER TABLE "pairing_guests" ADD CONSTRAINT "pairing_guests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
