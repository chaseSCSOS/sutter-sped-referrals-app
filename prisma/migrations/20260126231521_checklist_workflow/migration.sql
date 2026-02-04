-- CreateEnum
CREATE TYPE "ChecklistItemType" AS ENUM ('STUDENT_REGISTRATION', 'HOME_LANGUAGE_SURVEY', 'IMMUNIZATION_RECORD', 'RELEASE_OF_INFORMATION', 'CURRENT_IEP', 'PSYCHO_ED_REPORT', 'INTERIM_PLACEMENT_FORM', 'TRANSCRIPTS');

-- CreateEnum
CREATE TYPE "ChecklistStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'MISSING');

-- AlterTable
ALTER TABLE "Referral" ADD COLUMN     "currentIepDate" TIMESTAMP(3),
ADD COLUMN     "currentPsychoReportDate" TIMESTAMP(3),
ADD COLUMN     "nonSeisIep" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "DocumentChecklistItem" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "type" "ChecklistItemType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" "ChecklistStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "rejectionReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentFile" (
    "id" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT,

    CONSTRAINT "DocumentFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseOfInformationMetadata" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "disclosingName" TEXT,
    "disclosingAddress" TEXT,
    "disclosingPhone" TEXT,
    "disclosingFax" TEXT,
    "receivingName" TEXT,
    "receivingAddress" TEXT,
    "receivingPhone" TEXT,
    "receivingFax" TEXT,
    "purpose" TEXT,
    "informationRequested" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "signedBy" TEXT,
    "signedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseOfInformationMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentChecklistItem_referralId_idx" ON "DocumentChecklistItem"("referralId");

-- CreateIndex
CREATE INDEX "DocumentChecklistItem_type_idx" ON "DocumentChecklistItem"("type");

-- CreateIndex
CREATE INDEX "DocumentChecklistItem_status_idx" ON "DocumentChecklistItem"("status");

-- CreateIndex
CREATE INDEX "DocumentFile_checklistItemId_idx" ON "DocumentFile"("checklistItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseOfInformationMetadata_referralId_key" ON "ReleaseOfInformationMetadata"("referralId");

-- AddForeignKey
ALTER TABLE "DocumentChecklistItem" ADD CONSTRAINT "DocumentChecklistItem_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFile" ADD CONSTRAINT "DocumentFile_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "DocumentChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseOfInformationMetadata" ADD CONSTRAINT "ReleaseOfInformationMetadata_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;
