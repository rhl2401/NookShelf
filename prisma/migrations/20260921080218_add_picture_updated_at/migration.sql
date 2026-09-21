/*
  Warnings:

  - Added the required column `updatedAt` to the `Picture` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Picture" ADD COLUMN     "updatedAt" TIMESTAMP(3);
UPDATE "Picture" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "Picture" ALTER COLUMN "updatedAt" SET NOT NULL;
