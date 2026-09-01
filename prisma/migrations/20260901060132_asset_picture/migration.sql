-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "icon" TEXT,
ADD COLUMN     "primaryPhotoId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Asset_primaryPhotoId_key" ON "Asset"("primaryPhotoId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_primaryPhotoId_fkey" FOREIGN KEY ("primaryPhotoId") REFERENCES "Attachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

