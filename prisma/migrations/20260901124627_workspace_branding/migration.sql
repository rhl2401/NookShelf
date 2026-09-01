-- AlterTable
ALTER TABLE "WorkspaceSettings" ADD COLUMN     "appName" TEXT,
ADD COLUMN     "logoPath" TEXT,
ADD COLUMN     "logoSizeBytes" INTEGER,
ADD COLUMN     "signInHeadline" TEXT,
ADD COLUMN     "signInSubtitle" TEXT;

