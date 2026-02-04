-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'MISSING_DOCUMENTS', 'PENDING_ADDITIONAL_INFO', 'PENDING_APPROVAL', 'APPROVED', 'ACCEPTED_AWAITING_PLACEMENT', 'REJECTED', 'ON_HOLD', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PlacementType" AS ENUM ('FRA', 'SDC');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('EXTERNAL_ORG', 'TEACHER', 'SPED_STAFF', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('GENERAL', 'PHONE_CALL', 'EMAIL', 'MEETING', 'DOCUMENT_RECEIVED', 'DECISION_MADE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ORDERED', 'SHIPPED', 'RECEIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "confirmationNumber" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deadlineDate" TIMESTAMP(3) NOT NULL,
    "daysElapsed" INTEGER NOT NULL DEFAULT 0,
    "studentName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "age" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "fosterYouth" BOOLEAN NOT NULL,
    "birthplace" TEXT NOT NULL,
    "parentGuardianName" TEXT NOT NULL,
    "homePhone" TEXT,
    "cellPhone" TEXT,
    "homeAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "schoolOfAttendance" TEXT NOT NULL,
    "schoolOfResidence" TEXT NOT NULL,
    "transportationSpecialEd" BOOLEAN NOT NULL,
    "nativeLanguage" TEXT NOT NULL,
    "englishLearner" BOOLEAN NOT NULL,
    "elStartDate" TIMESTAMP(3),
    "redesignated" BOOLEAN,
    "reclassificationDate" TIMESTAMP(3),
    "ethnicity" TEXT NOT NULL,
    "residency" TEXT NOT NULL,
    "placementType" "PlacementType" NOT NULL,
    "silo" TEXT,
    "primaryDisability" TEXT NOT NULL,
    "disabilities" JSONB NOT NULL,
    "spedEntryDate" TIMESTAMP(3) NOT NULL,
    "interimPlacementReviewDate" TIMESTAMP(3) NOT NULL,
    "triennialDue" TIMESTAMP(3) NOT NULL,
    "lastPlacementSchool" TEXT NOT NULL,
    "lastPlacementDistrict" TEXT NOT NULL,
    "lastPlacementCounty" TEXT NOT NULL,
    "lastPlacementState" TEXT NOT NULL,
    "lastPlacementPhone" TEXT,
    "lastPlacementContactPerson" TEXT,
    "specialEdServices" JSONB NOT NULL,
    "percentageOutsideGenEd" INTEGER NOT NULL,
    "leaRepresentativeName" TEXT NOT NULL,
    "leaRepresentativePosition" TEXT NOT NULL,
    "submittedByEmail" TEXT,
    "additionalComments" TEXT,
    "rejectionReason" TEXT,
    "missingItems" JSONB,
    "lastReviewedAt" TIMESTAMP(3),
    "lastReviewedBy" TEXT,
    "assignedToStaffId" TEXT,
    "submittedByUserId" TEXT,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "fromStatus" "ReferralStatus",
    "toStatus" "ReferralStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT NOT NULL,
    "reason" TEXT,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "noteType" "NoteType" NOT NULL,
    "content" TEXT NOT NULL,
    "isImportant" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "supabaseUserId" TEXT,
    "phoneNumber" TEXT,
    "organization" TEXT,
    "jobTitle" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemLink" TEXT,
    "estimatedPrice" DECIMAL(10,2) NOT NULL,
    "actualPrice" DECIMAL(10,2),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "justification" TEXT NOT NULL,
    "requestorId" TEXT NOT NULL,
    "schoolSite" TEXT NOT NULL,
    "approverId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "lastStatusUpdate" TIMESTAMP(3),
    "purchaseOrderNumber" TEXT,
    "vendor" TEXT,
    "trackingNumber" TEXT,
    "expectedDelivery" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3),
    "budgetCategory" TEXT,
    "fiscalYear" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedByUserId" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderNote" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "noteType" "NoteType" NOT NULL DEFAULT 'GENERAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "OrderNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAttachment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "description" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,

    CONSTRAINT "OrderAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Referral_confirmationNumber_key" ON "Referral"("confirmationNumber");

-- CreateIndex
CREATE INDEX "Referral_status_idx" ON "Referral"("status");

-- CreateIndex
CREATE INDEX "Referral_submittedAt_idx" ON "Referral"("submittedAt");

-- CreateIndex
CREATE INDEX "Referral_deadlineDate_idx" ON "Referral"("deadlineDate");

-- CreateIndex
CREATE INDEX "Referral_confirmationNumber_idx" ON "Referral"("confirmationNumber");

-- CreateIndex
CREATE INDEX "Referral_submittedByUserId_idx" ON "Referral"("submittedByUserId");

-- CreateIndex
CREATE INDEX "Document_referralId_idx" ON "Document"("referralId");

-- CreateIndex
CREATE INDEX "Document_documentType_idx" ON "Document"("documentType");

-- CreateIndex
CREATE INDEX "StatusHistory_referralId_idx" ON "StatusHistory"("referralId");

-- CreateIndex
CREATE INDEX "StatusHistory_changedAt_idx" ON "StatusHistory"("changedAt");

-- CreateIndex
CREATE INDEX "Note_referralId_idx" ON "Note"("referralId");

-- CreateIndex
CREATE INDEX "Note_createdAt_idx" ON "Note"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseUserId_key" ON "User"("supabaseUserId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_supabaseUserId_idx" ON "User"("supabaseUserId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_requestorId_idx" ON "Order"("requestorId");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_idx" ON "OrderStatusHistory"("orderId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_createdAt_idx" ON "OrderStatusHistory"("createdAt");

-- CreateIndex
CREATE INDEX "OrderNote_orderId_idx" ON "OrderNote"("orderId");

-- CreateIndex
CREATE INDEX "OrderNote_createdAt_idx" ON "OrderNote"("createdAt");

-- CreateIndex
CREATE INDEX "OrderAttachment_orderId_idx" ON "OrderAttachment"("orderId");

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_assignedToStaffId_fkey" FOREIGN KEY ("assignedToStaffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_requestorId_fkey" FOREIGN KEY ("requestorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderNote" ADD CONSTRAINT "OrderNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderNote" ADD CONSTRAINT "OrderNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAttachment" ADD CONSTRAINT "OrderAttachment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
