-- AlterTable
ALTER TABLE "events" ADD COLUMN     "twoEventsDiscountType" TEXT,
ADD COLUMN     "twoEventsDiscountValue" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "rejectionReason" TEXT,
ALTER COLUMN "amount" SET DATA TYPE TEXT;
