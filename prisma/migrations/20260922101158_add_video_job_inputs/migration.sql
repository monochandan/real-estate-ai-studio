-- AlterTable
ALTER TABLE "GenerationJob" ADD COLUMN     "errorMessage" TEXT;

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "GenerationJobInput" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GenerationJobInput_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "GenerationJobInput_jobId_idx" ON "GenerationJobInput"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationJobInput_jobId_assetId_key" ON "GenerationJobInput"("jobId", "assetId");

-- AddForeignKey
ALTER TABLE "GenerationJobInput" ADD CONSTRAINT "GenerationJobInput_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "GenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJobInput" ADD CONSTRAINT "GenerationJobInput_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
