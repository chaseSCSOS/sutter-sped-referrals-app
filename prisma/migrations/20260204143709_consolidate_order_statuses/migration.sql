-- AlterEnum: Consolidate OrderStatus from 8 statuses to 5 statuses
-- This migration maps existing statuses to new consolidated statuses:
--   PENDING → NEW
--   UNDER_REVIEW → NEW
--   APPROVED → SHIPPED
--   ORDERED → SHIPPED
--   REJECTED → CANCELLED
--   SHIPPED → SHIPPED (unchanged)
--   RECEIVED → RECEIVED (unchanged)
--   CANCELLED → CANCELLED (unchanged)
-- New status: COMPLETED (for orders delivered to teachers)

-- Step 1: Add temporary text columns for status mapping
ALTER TABLE "Order" ADD COLUMN "status_new" TEXT;
ALTER TABLE "OrderStatusHistory" ADD COLUMN "status_new" TEXT;

-- Step 2: Map old statuses to new statuses for Order table
UPDATE "Order" SET "status_new" = CASE
  WHEN "status" = 'PENDING' THEN 'NEW'
  WHEN "status" = 'UNDER_REVIEW' THEN 'NEW'
  WHEN "status" = 'APPROVED' THEN 'SHIPPED'
  WHEN "status" = 'ORDERED' THEN 'SHIPPED'
  WHEN "status" = 'REJECTED' THEN 'CANCELLED'
  WHEN "status" = 'SHIPPED' THEN 'SHIPPED'
  WHEN "status" = 'RECEIVED' THEN 'RECEIVED'
  WHEN "status" = 'CANCELLED' THEN 'CANCELLED'
  ELSE 'NEW'
END;

-- Step 3: Map old statuses to new statuses for OrderStatusHistory table
UPDATE "OrderStatusHistory" SET "status_new" = CASE
  WHEN "status" = 'PENDING' THEN 'NEW'
  WHEN "status" = 'UNDER_REVIEW' THEN 'NEW'
  WHEN "status" = 'APPROVED' THEN 'SHIPPED'
  WHEN "status" = 'ORDERED' THEN 'SHIPPED'
  WHEN "status" = 'REJECTED' THEN 'CANCELLED'
  WHEN "status" = 'SHIPPED' THEN 'SHIPPED'
  WHEN "status" = 'RECEIVED' THEN 'RECEIVED'
  WHEN "status" = 'CANCELLED' THEN 'CANCELLED'
  ELSE 'NEW'
END;

-- Step 4: Drop old status columns
ALTER TABLE "Order" DROP COLUMN "status";
ALTER TABLE "OrderStatusHistory" DROP COLUMN "status";

-- Step 5: Drop the old enum type
DROP TYPE "OrderStatus";

-- Step 6: Create new enum with 5 values
CREATE TYPE "OrderStatus" AS ENUM ('NEW', 'SHIPPED', 'RECEIVED', 'COMPLETED', 'CANCELLED');

-- Step 7: Rename temporary columns to status with new enum type
ALTER TABLE "Order" ADD COLUMN "status" "OrderStatus" NOT NULL DEFAULT 'NEW';
ALTER TABLE "OrderStatusHistory" ADD COLUMN "status" "OrderStatus" NOT NULL;

-- Step 8: Copy data from temp columns to new status columns
UPDATE "Order" SET "status" = "status_new"::"OrderStatus";
UPDATE "OrderStatusHistory" SET "status" = "status_new"::"OrderStatus";

-- Step 9: Drop temporary columns
ALTER TABLE "Order" DROP COLUMN "status_new";
ALTER TABLE "OrderStatusHistory" DROP COLUMN "status_new";
