-- AlterTable
ALTER TABLE "User" ADD COLUMN     "videoSettings" JSONB;

-- CreateTable
CREATE TABLE "PropertyPhoto" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "originalAssetId" TEXT NOT NULL,
    "selectedAssetId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "roomType" TEXT,
    "roomTypeSource" TEXT,
    "analysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,

    CONSTRAINT "PropertyPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyPhoto_projectId_idx" ON "PropertyPhoto"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyPhoto_projectId_sortOrder_key" ON "PropertyPhoto"("projectId", "sortOrder");

-- AddForeignKey
ALTER TABLE "PropertyPhoto" ADD CONSTRAINT "PropertyPhoto_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPhoto" ADD CONSTRAINT "PropertyPhoto_originalAssetId_fkey" FOREIGN KEY ("originalAssetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPhoto" ADD CONSTRAINT "PropertyPhoto_selectedAssetId_fkey" FOREIGN KEY ("selectedAssetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyPhoto" ADD CONSTRAINT "PropertyPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
