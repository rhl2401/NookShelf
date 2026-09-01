-- AlterTable
ALTER TABLE "AssetType" ADD COLUMN     "primaryPictureId" TEXT;

-- AlterTable
ALTER TABLE "Kit" ADD COLUMN     "icon" TEXT,
ADD COLUMN     "iconColor" TEXT,
ADD COLUMN     "primaryPictureId" TEXT;

-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "avatarPath" TEXT,
ADD COLUMN     "avatarSizeBytes" INTEGER;

-- AddForeignKey
ALTER TABLE "AssetType" ADD CONSTRAINT "AssetType_primaryPictureId_fkey" FOREIGN KEY ("primaryPictureId") REFERENCES "Picture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kit" ADD CONSTRAINT "Kit_primaryPictureId_fkey" FOREIGN KEY ("primaryPictureId") REFERENCES "Picture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

