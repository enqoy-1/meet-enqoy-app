-- AlterTable
ALTER TABLE "bookings"
ADD COLUMN "purchasedTwoEvents" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "creditGranted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "events"
ADD COLUMN "pairingPublished" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "bookingCutoffHours" SET DEFAULT 24;
