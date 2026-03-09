/*
  Warnings:

  - The `silo` column on the `Referral` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ProgramTrack" AS ENUM ('GENERAL', 'BEHAVIOR', 'DHH', 'SCIP', 'VIP');

-- CreateEnum
CREATE TYPE "Silo" AS ENUM ('ASD', 'SD', 'NC', 'DHH', 'MD', 'OT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReferralStatus" ADD VALUE 'NOT_ENROLLING';
ALTER TYPE "ReferralStatus" ADD VALUE 'WITHDRAWN';

-- AlterTable
ALTER TABLE "EmailSettings" ADD COLUMN     "cumReminderDays" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "seisAeriesReminderDays" INTEGER NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "Referral" ADD COLUMN     "cumNotes" TEXT,
ADD COLUMN     "cumProcessedByStaffId" TEXT,
ADD COLUMN     "cumReceivedDate" TIMESTAMP(3),
ADD COLUMN     "cumRequestedDate" TIMESTAMP(3),
ADD COLUMN     "cumSentDate" TIMESTAMP(3),
ADD COLUMN     "dateStudentStartedSchool" TIMESTAMP(3),
ADD COLUMN     "districtOfResidence" TEXT,
ADD COLUMN     "inAeries" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inAeriesDate" TIMESTAMP(3),
ADD COLUMN     "inSEIS" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inSEISDate" TIMESTAMP(3),
ADD COLUMN     "programTrack" "ProgramTrack" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "referringParty" TEXT,
ADD COLUMN     "serviceProvider" TEXT,
DROP COLUMN "silo",
ADD COLUMN     "silo" "Silo";

-- CreateIndex
CREATE INDEX "Referral_programTrack_idx" ON "Referral"("programTrack");

-- CreateIndex
CREATE INDEX "Referral_districtOfResidence_idx" ON "Referral"("districtOfResidence");

-- CreateIndex
CREATE INDEX "Referral_silo_idx" ON "Referral"("silo");

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_cumProcessedByStaffId_fkey" FOREIGN KEY ("cumProcessedByStaffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
