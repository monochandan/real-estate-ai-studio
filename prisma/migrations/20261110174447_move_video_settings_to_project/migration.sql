/*
  Warnings:

  - You are about to drop the column `userId` on the `PropertyPhoto` table. All the data in the column will be lost.
  - You are about to drop the column `videoSettings` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "PropertyPhoto" DROP CONSTRAINT "PropertyPhoto_userId_fkey";

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "videoSettings" JSONB;

-- AlterTable
ALTER TABLE "PropertyPhoto" DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "videoSettings";
