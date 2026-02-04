-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemLink" TEXT,
    "estimatedPrice" DECIMAL(10,2) NOT NULL,
    "actualPrice" DECIMAL(10,2),
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing order data to OrderItem table
INSERT INTO "OrderItem" ("id", "orderId", "itemName", "itemLink", "estimatedPrice", "actualPrice", "quantity", "createdAt")
SELECT
    gen_random_uuid(),
    "id",
    "itemName",
    "itemLink",
    "estimatedPrice",
    "actualPrice",
    "quantity",
    "createdAt"
FROM "Order";

-- AlterTable: Add new columns to Order
ALTER TABLE "Order" ADD COLUMN "totalEstimatedPrice" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "totalActualPrice" DECIMAL(10,2);

-- Update totalEstimatedPrice based on existing items
UPDATE "Order" o
SET "totalEstimatedPrice" = COALESCE(o."estimatedPrice" * o."quantity", 0);

-- Update totalActualPrice based on existing items where applicable
UPDATE "Order" o
SET "totalActualPrice" = o."actualPrice" * o."quantity"
WHERE o."actualPrice" IS NOT NULL;

-- AlterTable: Drop old item columns from Order
ALTER TABLE "Order" DROP COLUMN "actualPrice";
ALTER TABLE "Order" DROP COLUMN "estimatedPrice";
ALTER TABLE "Order" DROP COLUMN "itemLink";
ALTER TABLE "Order" DROP COLUMN "itemName";
ALTER TABLE "Order" DROP COLUMN "quantity";
