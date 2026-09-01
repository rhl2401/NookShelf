-- CreateEnum
CREATE TYPE "PictureScope" AS ENUM ('PERSONAL', 'WORKSPACE');

-- DropForeignKey
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_primaryPhotoId_fkey";

-- DropIndex
DROP INDEX "Asset_primaryPhotoId_key";

-- AlterTable
ALTER TABLE "Asset" DROP COLUMN "primaryPhotoId",
ADD COLUMN     "primaryPictureId" TEXT;

-- CreateTable
CREATE TABLE "Picture" (
    "id" TEXT NOT NULL,
    "scope" "PictureScope" NOT NULL DEFAULT 'PERSONAL',
    "ownerId" TEXT,
    "path" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Picture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Picture_ownerId_idx" ON "Picture"("ownerId");

-- CreateIndex
CREATE INDEX "Picture_scope_idx" ON "Picture"("scope");

-- CreateIndex
CREATE INDEX "Asset_primaryPictureId_idx" ON "Asset"("primaryPictureId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_primaryPictureId_fkey" FOREIGN KEY ("primaryPictureId") REFERENCES "Picture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Picture" ADD CONSTRAINT "Picture_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

