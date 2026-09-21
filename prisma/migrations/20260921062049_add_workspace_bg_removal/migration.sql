-- AlterTable
ALTER TABLE "WorkspaceSettings" ADD COLUMN     "bgRemovalApiKey" TEXT,
ADD COLUMN     "bgRemovalProvider" TEXT NOT NULL DEFAULT 'local';
