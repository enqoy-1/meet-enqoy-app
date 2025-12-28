-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "assessmentOptional" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paidByInviter" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "usedCredit" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "events" ALTER COLUMN "capacity" DROP NOT NULL;

-- AlterTable
ALTER TABLE "pairing_restaurants" ALTER COLUMN "capacity" DROP NOT NULL;

-- AlterTable
ALTER TABLE "pairing_tables" ALTER COLUMN "capacity" DROP NOT NULL;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "eventCredits" INTEGER NOT NULL DEFAULT 0;
