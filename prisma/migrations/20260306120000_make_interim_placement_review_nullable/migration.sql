-- Make interimPlacementReviewDate optional now that the form field is removed
ALTER TABLE "Referral"
ALTER COLUMN "interimPlacementReviewDate" DROP NOT NULL;
