/*
  Warnings:

  - A unique constraint covering the columns `[paymentId]` on the table `CreditTransaction` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CreditTransaction_paymentId_key" ON "CreditTransaction"("paymentId");
