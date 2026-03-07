-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('SUPPLY', 'PROTOCOL_ASSESSMENT');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "assessmentCategoryId" TEXT,
ADD COLUMN     "orderType" "OrderType" NOT NULL DEFAULT 'SUPPLY';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "assessmentTestId" TEXT;

-- CreateTable
CREATE TABLE "EmailSettings" (
    "id" TEXT NOT NULL,
    "orderNotifyEmails" TEXT[],
    "referralNotifyEmails" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentVendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentVendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentTest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "purchaseUrl" TEXT,
    "estimatedPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isPhysical" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentTest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentCategory_name_key" ON "AssessmentCategory"("name");

-- CreateIndex
CREATE INDEX "AssessmentCategory_isActive_idx" ON "AssessmentCategory"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentVendor_name_key" ON "AssessmentVendor"("name");

-- CreateIndex
CREATE INDEX "AssessmentVendor_isActive_idx" ON "AssessmentVendor"("isActive");

-- CreateIndex
CREATE INDEX "AssessmentTest_vendorId_idx" ON "AssessmentTest"("vendorId");

-- CreateIndex
CREATE INDEX "AssessmentTest_categoryId_idx" ON "AssessmentTest"("categoryId");

-- CreateIndex
CREATE INDEX "AssessmentTest_isActive_idx" ON "AssessmentTest"("isActive");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_assessmentCategoryId_fkey" FOREIGN KEY ("assessmentCategoryId") REFERENCES "AssessmentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_assessmentTestId_fkey" FOREIGN KEY ("assessmentTestId") REFERENCES "AssessmentTest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentTest" ADD CONSTRAINT "AssessmentTest_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "AssessmentVendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentTest" ADD CONSTRAINT "AssessmentTest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssessmentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
