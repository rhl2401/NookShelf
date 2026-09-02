-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "backgroundShade" TEXT;

-- AlterTable
ALTER TABLE "WorkspaceSettings" ADD COLUMN     "defaultBackgroundShade" TEXT NOT NULL DEFAULT 'cream';
