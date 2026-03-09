-- AlterTable
ALTER TABLE "Referral" ADD COLUMN     "classroomTeacher" TEXT,
ADD COLUMN     "pipIndicator" BOOLEAN NOT NULL DEFAULT false;
