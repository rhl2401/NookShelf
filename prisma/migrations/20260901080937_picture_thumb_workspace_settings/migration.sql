-- AlterTable
ALTER TABLE "Picture" ADD COLUMN     "thumbPath" TEXT,
ADD COLUMN     "thumbSizeBytes" INTEGER;

-- CreateTable
CREATE TABLE "WorkspaceSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "pictureSize" INTEGER NOT NULL DEFAULT 512,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

