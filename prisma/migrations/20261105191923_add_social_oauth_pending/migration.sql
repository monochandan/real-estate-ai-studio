-- CreateTable
CREATE TABLE "SocialOAuthPending" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "selectionKeyHash" TEXT NOT NULL,
    "accountsEncrypted" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialOAuthPending_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialOAuthPending_selectionKeyHash_key" ON "SocialOAuthPending"("selectionKeyHash");

-- CreateIndex
CREATE INDEX "SocialOAuthPending_userId_idx" ON "SocialOAuthPending"("userId");

-- CreateIndex
CREATE INDEX "SocialOAuthPending_expiresAt_idx" ON "SocialOAuthPending"("expiresAt");

-- AddForeignKey
ALTER TABLE "SocialOAuthPending" ADD CONSTRAINT "SocialOAuthPending_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
