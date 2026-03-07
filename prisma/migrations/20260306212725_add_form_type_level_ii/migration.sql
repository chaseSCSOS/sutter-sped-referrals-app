-- CreateEnum
CREATE TYPE "FormType" AS ENUM ('INTERIM', 'DHH_ITINERANT', 'LEVEL_II');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ChecklistItemType" ADD VALUE 'RATIONALE_FOR_REFERRAL';
ALTER TYPE "ChecklistItemType" ADD VALUE 'MULTIDISCIPLINARY_TEAM_REPORT';
ALTER TYPE "ChecklistItemType" ADD VALUE 'BEHAVIOR_ASSESSMENT';
ALTER TYPE "ChecklistItemType" ADD VALUE 'INTERVENTION_STRATEGIES';
ALTER TYPE "ChecklistItemType" ADD VALUE 'CURRENT_ACADEMIC_ASSESSMENT';
ALTER TYPE "ChecklistItemType" ADD VALUE 'REPORTS_OTHER_AGENCIES';
ALTER TYPE "ChecklistItemType" ADD VALUE 'CURRENT_BEHAVIOR_PLAN';
ALTER TYPE "ChecklistItemType" ADD VALUE 'IEP_DOCUMENTATION';
ALTER TYPE "ChecklistItemType" ADD VALUE 'PRIMARY_MODE_OF_LEARNING';
ALTER TYPE "ChecklistItemType" ADD VALUE 'PRESCRIBED_MEDICATION';
ALTER TYPE "ChecklistItemType" ADD VALUE 'AUDIOGRAM_CHART';

-- AlterTable
ALTER TABLE "Referral" ADD COLUMN     "formType" "FormType" NOT NULL DEFAULT 'INTERIM',
ALTER COLUMN "age" DROP NOT NULL,
ALTER COLUMN "gender" DROP NOT NULL,
ALTER COLUMN "parentGuardianName" DROP NOT NULL,
ALTER COLUMN "homeAddress" DROP NOT NULL,
ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "state" DROP NOT NULL,
ALTER COLUMN "zipCode" DROP NOT NULL,
ALTER COLUMN "schoolOfAttendance" DROP NOT NULL,
ALTER COLUMN "schoolOfResidence" DROP NOT NULL,
ALTER COLUMN "transportationSpecialEd" DROP NOT NULL,
ALTER COLUMN "nativeLanguage" DROP NOT NULL,
ALTER COLUMN "englishLearner" DROP NOT NULL,
ALTER COLUMN "ethnicity" DROP NOT NULL,
ALTER COLUMN "residency" DROP NOT NULL,
ALTER COLUMN "placementType" DROP NOT NULL,
ALTER COLUMN "primaryDisability" DROP NOT NULL,
ALTER COLUMN "disabilities" DROP NOT NULL,
ALTER COLUMN "spedEntryDate" DROP NOT NULL,
ALTER COLUMN "triennialDue" DROP NOT NULL,
ALTER COLUMN "lastPlacementSchool" DROP NOT NULL,
ALTER COLUMN "lastPlacementDistrict" DROP NOT NULL,
ALTER COLUMN "lastPlacementCounty" DROP NOT NULL,
ALTER COLUMN "lastPlacementState" DROP NOT NULL,
ALTER COLUMN "specialEdServices" DROP NOT NULL,
ALTER COLUMN "percentageOutsideGenEd" DROP NOT NULL,
ALTER COLUMN "leaRepresentativeName" DROP NOT NULL,
ALTER COLUMN "leaRepresentativePosition" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");
