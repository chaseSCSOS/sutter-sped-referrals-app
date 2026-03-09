-- CreateTable
CREATE TABLE "ReferralDraft" (
    "id" TEXT NOT NULL,
    "draftNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "formType" "FormType" NOT NULL,
    "formData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralDraft_draftNumber_key" ON "ReferralDraft"("draftNumber");

-- CreateIndex
CREATE INDEX "ReferralDraft_email_idx" ON "ReferralDraft"("email");

-- CreateIndex
CREATE INDEX "ReferralDraft_draftNumber_idx" ON "ReferralDraft"("draftNumber");

-- CreateIndex
CREATE INDEX "ReferralDraft_expiresAt_idx" ON "ReferralDraft"("expiresAt");
