-- AlterTable
ALTER TABLE "User" ADD COLUMN "roleOptionId" TEXT;

-- CreateTable
CREATE TABLE "UserRoleOption" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseRole" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "UserRoleOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleOption_name_key" ON "UserRoleOption"("name");

-- CreateIndex
CREATE INDEX "UserRoleOption_baseRole_idx" ON "UserRoleOption"("baseRole");

-- CreateIndex
CREATE INDEX "User_roleOptionId_idx" ON "User"("roleOptionId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleOptionId_fkey" FOREIGN KEY ("roleOptionId") REFERENCES "UserRoleOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
