-- CreateEnum
CREATE TYPE "ProgramSilo" AS ENUM ('ASD_ELEM', 'ASD_MIDHS', 'SD', 'NC', 'DHH', 'ATP', 'MD');

-- CreateEnum
CREATE TYPE "GradeBand" AS ENUM ('PRE_TK', 'TK', 'K_2', 'THREE_FIVE', 'SIX_EIGHT', 'NINE_TWELVE', 'EIGHTEEN_22', 'MIXED');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('AM', 'PM', 'FULL_DAY', 'PERIOD_ATTENDANCE', 'SELF_CONTAINED');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('TEACHER', 'CLASS_PARA', 'ONE_TO_ONE_PARA', 'INTERPRETER', 'SIGNING_PARA', 'LVN');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'REFERRAL_PENDING', 'REFERRAL_NOT_RECEIVED', 'REFERRAL_ON_HOLD', 'PLACED_NOT_IN_SYSTEMS', 'HOME_INSTRUCTION', 'RTD_IN_PROGRESS', 'EXITED');

-- CreateEnum
CREATE TYPE "TransferReason" AS ENUM ('GRADE_PROMOTION', 'CASELOAD_BALANCE', 'BEHAVIOR_PLACEMENT_CHANGE', 'PROGRAM_CHANGE', 'PARENT_REQUEST', 'OTHER');

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "StaffRole" NOT NULL,
    "positionControlNumber" TEXT,
    "credentials" TEXT,
    "isVacancy" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "schoolYear" TEXT NOT NULL,
    "classroomId" TEXT,
    "oneToOneStudentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL,
    "programSilo" "ProgramSilo" NOT NULL,
    "siteId" TEXT NOT NULL,
    "gradeBand" "GradeBand" NOT NULL,
    "sessionNumber" TEXT,
    "sessionType" "SessionType" NOT NULL,
    "positionControlNumber" TEXT,
    "credentials" TEXT,
    "maxCapacity" INTEGER,
    "schoolYear" TEXT NOT NULL,
    "isOpenPosition" BOOLEAN NOT NULL DEFAULT false,
    "teacherId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentPlacement" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "studentNameFirst" TEXT NOT NULL,
    "studentNameLast" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "grade" TEXT NOT NULL,
    "districtOfResidence" TEXT,
    "disabilityCodes" TEXT[],
    "primaryDisability" TEXT,
    "classroomId" TEXT,
    "enrollmentStatus" "EnrollmentStatus" NOT NULL DEFAULT 'REFERRAL_PENDING',
    "schoolYear" TEXT NOT NULL,
    "requires1to1" BOOLEAN NOT NULL DEFAULT false,
    "seisConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "seisConfirmedAt" TIMESTAMP(3),
    "seisConfirmedBy" TEXT,
    "aeriesConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "aeriesConfirmedAt" TIMESTAMP(3),
    "aeriesConfirmedBy" TEXT,
    "ageOutDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferEvent" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromClassroomId" TEXT,
    "toClassroomId" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "reason" "TransferReason" NOT NULL,
    "initiatedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransferEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RTDChecklist" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "dorNotified" BOOLEAN NOT NULL DEFAULT false,
    "dorNotifiedAt" TIMESTAMP(3),
    "dorNotifiedBy" TEXT,
    "parentNotified" BOOLEAN NOT NULL DEFAULT false,
    "parentNotifiedAt" TIMESTAMP(3),
    "parentNotifiedBy" TEXT,
    "secondStaffingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "secondStaffingAt" TIMESTAMP(3),
    "secondStaffingBy" TEXT,
    "transitionIepHeld" BOOLEAN NOT NULL DEFAULT false,
    "transitionIepAt" TIMESTAMP(3),
    "transitionIepBy" TEXT,
    "packetCompleted" BOOLEAN NOT NULL DEFAULT false,
    "packetCompletedAt" TIMESTAMP(3),
    "packetCompletedBy" TEXT,
    "packetSignedScanned" BOOLEAN NOT NULL DEFAULT false,
    "packetSignedAt" TIMESTAMP(3),
    "packetSignedBy" TEXT,
    "aeriesExitCompleted" BOOLEAN NOT NULL DEFAULT false,
    "aeriesExitAt" TIMESTAMP(3),
    "aeriesExitBy" TEXT,
    "seisExitCompleted" BOOLEAN NOT NULL DEFAULT false,
    "seisExitAt" TIMESTAMP(3),
    "seisExitBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RTDChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "busNumber" TEXT,
    "transportType" TEXT,
    "amPmFlag" TEXT,
    "specialTransportNotes" TEXT,
    "isWheelchair" BOOLEAN NOT NULL DEFAULT false,
    "needsCarSeat" BOOLEAN NOT NULL DEFAULT false,
    "needsSafetyVest" BOOLEAN NOT NULL DEFAULT false,
    "needsSafetyLock" BOOLEAN NOT NULL DEFAULT false,
    "needsBusAide" BOOLEAN NOT NULL DEFAULT false,
    "riderAtHome" BOOLEAN NOT NULL DEFAULT false,
    "reducedDaySchedule" BOOLEAN NOT NULL DEFAULT false,
    "transportPending" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacementAuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" TEXT,

    CONSTRAINT "PlacementAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningDraft" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "schoolYear" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlanningDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftClassroom" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "sourceClassroomId" TEXT,
    "programSilo" "ProgramSilo" NOT NULL,
    "siteId" TEXT NOT NULL,
    "gradeBand" "GradeBand" NOT NULL,
    "sessionType" "SessionType" NOT NULL,
    "positionControlNumber" TEXT,
    "credentials" TEXT,
    "teacherName" TEXT,
    "isOpenPosition" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DraftClassroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftStudentPlacement" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "sourcePlacementId" TEXT,
    "draftClassroomId" TEXT,
    "studentNameFirst" TEXT NOT NULL,
    "studentNameLast" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "primaryDisability" TEXT,
    "requires1to1" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DraftStudentPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Site_name_key" ON "Site"("name");

-- CreateIndex
CREATE INDEX "Site_isActive_idx" ON "Site"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StaffMember_oneToOneStudentId_key" ON "StaffMember"("oneToOneStudentId");

-- CreateIndex
CREATE INDEX "StaffMember_role_idx" ON "StaffMember"("role");

-- CreateIndex
CREATE INDEX "StaffMember_schoolYear_idx" ON "StaffMember"("schoolYear");

-- CreateIndex
CREATE INDEX "StaffMember_isActive_idx" ON "StaffMember"("isActive");

-- CreateIndex
CREATE INDEX "StaffMember_classroomId_idx" ON "StaffMember"("classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_teacherId_key" ON "Classroom"("teacherId");

-- CreateIndex
CREATE INDEX "Classroom_programSilo_idx" ON "Classroom"("programSilo");

-- CreateIndex
CREATE INDEX "Classroom_siteId_idx" ON "Classroom"("siteId");

-- CreateIndex
CREATE INDEX "Classroom_schoolYear_idx" ON "Classroom"("schoolYear");

-- CreateIndex
CREATE INDEX "Classroom_teacherId_idx" ON "Classroom"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentPlacement_referralId_key" ON "StudentPlacement"("referralId");

-- CreateIndex
CREATE INDEX "StudentPlacement_classroomId_idx" ON "StudentPlacement"("classroomId");

-- CreateIndex
CREATE INDEX "StudentPlacement_enrollmentStatus_idx" ON "StudentPlacement"("enrollmentStatus");

-- CreateIndex
CREATE INDEX "StudentPlacement_schoolYear_idx" ON "StudentPlacement"("schoolYear");

-- CreateIndex
CREATE INDEX "TransferEvent_studentId_idx" ON "TransferEvent"("studentId");

-- CreateIndex
CREATE INDEX "TransferEvent_effectiveDate_idx" ON "TransferEvent"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "RTDChecklist_studentId_key" ON "RTDChecklist"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "TransportRecord_studentId_key" ON "TransportRecord"("studentId");

-- CreateIndex
CREATE INDEX "PlacementAuditLog_entityType_entityId_idx" ON "PlacementAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "PlacementAuditLog_studentId_idx" ON "PlacementAuditLog"("studentId");

-- CreateIndex
CREATE INDEX "PlacementAuditLog_changedAt_idx" ON "PlacementAuditLog"("changedAt");

-- CreateIndex
CREATE INDEX "DraftClassroom_draftId_idx" ON "DraftClassroom"("draftId");

-- CreateIndex
CREATE INDEX "DraftStudentPlacement_draftId_idx" ON "DraftStudentPlacement"("draftId");

-- CreateIndex
CREATE INDEX "DraftStudentPlacement_draftClassroomId_idx" ON "DraftStudentPlacement"("draftClassroomId");

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMember" ADD CONSTRAINT "StaffMember_oneToOneStudentId_fkey" FOREIGN KEY ("oneToOneStudentId") REFERENCES "StudentPlacement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "StaffMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPlacement" ADD CONSTRAINT "StudentPlacement_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPlacement" ADD CONSTRAINT "StudentPlacement_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferEvent" ADD CONSTRAINT "TransferEvent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentPlacement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferEvent" ADD CONSTRAINT "TransferEvent_fromClassroomId_fkey" FOREIGN KEY ("fromClassroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferEvent" ADD CONSTRAINT "TransferEvent_toClassroomId_fkey" FOREIGN KEY ("toClassroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RTDChecklist" ADD CONSTRAINT "RTDChecklist_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentPlacement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportRecord" ADD CONSTRAINT "TransportRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentPlacement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacementAuditLog" ADD CONSTRAINT "PlacementAuditLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentPlacement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftClassroom" ADD CONSTRAINT "DraftClassroom_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "PlanningDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftStudentPlacement" ADD CONSTRAINT "DraftStudentPlacement_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "PlanningDraft"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftStudentPlacement" ADD CONSTRAINT "DraftStudentPlacement_draftClassroomId_fkey" FOREIGN KEY ("draftClassroomId") REFERENCES "DraftClassroom"("id") ON DELETE SET NULL ON UPDATE CASCADE;
