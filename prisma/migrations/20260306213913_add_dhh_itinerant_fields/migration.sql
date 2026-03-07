-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ChecklistItemType" ADD VALUE 'DHH_REFERRAL_REQUEST';
ALTER TYPE "ChecklistItemType" ADD VALUE 'ACCOMMODATIONS_MODIFICATIONS';
ALTER TYPE "ChecklistItemType" ADD VALUE 'AUDIOLOGY_REPORT';

-- AlterTable
ALTER TABLE "Referral" ADD COLUMN     "formMetadata" JSONB,
ALTER COLUMN "fosterYouth" DROP NOT NULL,
ALTER COLUMN "birthplace" DROP NOT NULL;
