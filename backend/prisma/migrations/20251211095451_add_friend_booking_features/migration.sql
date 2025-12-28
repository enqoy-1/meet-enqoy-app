-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "bookedForFriend" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "friendEmail" TEXT,
ADD COLUMN     "friendName" TEXT,
ADD COLUMN     "friendPhone" TEXT,
ADD COLUMN     "invitedById" TEXT;

-- CreateTable
CREATE TABLE "friend_invitations" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "friendEmail" TEXT NOT NULL,
    "friendName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "friend_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "friend_invitations_token_key" ON "friend_invitations"("token");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_invitations" ADD CONSTRAINT "friend_invitations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friend_invitations" ADD CONSTRAINT "friend_invitations_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
