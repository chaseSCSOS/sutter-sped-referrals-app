-- Migration: Add classroom enhancements
-- - Add classroomNumber to Classroom
-- - Add district to Site
-- - Replace gradeBand enum with gradeStart + gradeEnd strings on Classroom and DraftClassroom

-- Add classroomNumber to Classroom
ALTER TABLE "Classroom" ADD COLUMN IF NOT EXISTS "classroomNumber" TEXT;

-- Add district to Site
ALTER TABLE "Site" ADD COLUMN IF NOT EXISTS "district" TEXT;

-- Add gradeStart and gradeEnd to Classroom (with migration from gradeBand)
ALTER TABLE "Classroom" ADD COLUMN IF NOT EXISTS "gradeStart" TEXT;
ALTER TABLE "Classroom" ADD COLUMN IF NOT EXISTS "gradeEnd" TEXT;

-- Migrate existing gradeBand values
UPDATE "Classroom" SET
  "gradeStart" = CASE "gradeBand"::TEXT
    WHEN 'PRE_TK' THEN 'Pre-TK'
    WHEN 'TK' THEN 'TK'
    WHEN 'K_2' THEN 'K'
    WHEN 'THREE_FIVE' THEN '3'
    WHEN 'SIX_EIGHT' THEN '6'
    WHEN 'NINE_TWELVE' THEN '9'
    WHEN 'EIGHTEEN_22' THEN '18-22'
    WHEN 'MIXED' THEN 'Mixed'
    ELSE 'K'
  END,
  "gradeEnd" = CASE "gradeBand"::TEXT
    WHEN 'PRE_TK' THEN 'Pre-TK'
    WHEN 'TK' THEN 'TK'
    WHEN 'K_2' THEN '2'
    WHEN 'THREE_FIVE' THEN '5'
    WHEN 'SIX_EIGHT' THEN '8'
    WHEN 'NINE_TWELVE' THEN '12'
    WHEN 'EIGHTEEN_22' THEN '18-22'
    WHEN 'MIXED' THEN 'Mixed'
    ELSE 'K'
  END
WHERE "gradeBand" IS NOT NULL;

-- Set defaults for any NULLs
UPDATE "Classroom" SET "gradeStart" = 'K' WHERE "gradeStart" IS NULL;
UPDATE "Classroom" SET "gradeEnd" = 'K' WHERE "gradeEnd" IS NULL;

-- Make columns NOT NULL
ALTER TABLE "Classroom" ALTER COLUMN "gradeStart" SET NOT NULL;
ALTER TABLE "Classroom" ALTER COLUMN "gradeEnd" SET NOT NULL;

-- Drop old gradeBand column
ALTER TABLE "Classroom" DROP COLUMN IF EXISTS "gradeBand";

-- Add gradeStart and gradeEnd to DraftClassroom
ALTER TABLE "DraftClassroom" ADD COLUMN IF NOT EXISTS "gradeStart" TEXT;
ALTER TABLE "DraftClassroom" ADD COLUMN IF NOT EXISTS "gradeEnd" TEXT;

UPDATE "DraftClassroom" SET
  "gradeStart" = CASE "gradeBand"::TEXT
    WHEN 'PRE_TK' THEN 'Pre-TK'
    WHEN 'TK' THEN 'TK'
    WHEN 'K_2' THEN 'K'
    WHEN 'THREE_FIVE' THEN '3'
    WHEN 'SIX_EIGHT' THEN '6'
    WHEN 'NINE_TWELVE' THEN '9'
    WHEN 'EIGHTEEN_22' THEN '18-22'
    WHEN 'MIXED' THEN 'Mixed'
    ELSE 'K'
  END,
  "gradeEnd" = CASE "gradeBand"::TEXT
    WHEN 'PRE_TK' THEN 'Pre-TK'
    WHEN 'TK' THEN 'TK'
    WHEN 'K_2' THEN '2'
    WHEN 'THREE_FIVE' THEN '5'
    WHEN 'SIX_EIGHT' THEN '8'
    WHEN 'NINE_TWELVE' THEN '12'
    WHEN 'EIGHTEEN_22' THEN '18-22'
    WHEN 'MIXED' THEN 'Mixed'
    ELSE 'K'
  END
WHERE "gradeBand" IS NOT NULL;

UPDATE "DraftClassroom" SET "gradeStart" = 'K' WHERE "gradeStart" IS NULL;
UPDATE "DraftClassroom" SET "gradeEnd" = 'K' WHERE "gradeEnd" IS NULL;

ALTER TABLE "DraftClassroom" ALTER COLUMN "gradeStart" SET NOT NULL;
ALTER TABLE "DraftClassroom" ALTER COLUMN "gradeEnd" SET NOT NULL;

ALTER TABLE "DraftClassroom" DROP COLUMN IF EXISTS "gradeBand";

-- Drop GradeBand enum if no longer used
DROP TYPE IF EXISTS "GradeBand";
