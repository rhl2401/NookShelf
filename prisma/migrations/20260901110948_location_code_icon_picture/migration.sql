-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "code" TEXT,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "iconColor" TEXT,
ADD COLUMN     "primaryPictureId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Location_code_key" ON "Location"("code");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_primaryPictureId_fkey" FOREIGN KEY ("primaryPictureId") REFERENCES "Picture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

