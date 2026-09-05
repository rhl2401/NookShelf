-- AlterTable
ALTER TABLE "AssetType" ADD COLUMN     "inheritIcon" BOOLEAN NOT NULL DEFAULT true;

-- Generic covers too broad a mix of items for one shared icon to make sense
-- on every un-iconed asset of that type — opt it out of inheritance so new
-- installs match the behavior seed.ts sets for fresh Generic rows.
UPDATE "AssetType" SET "inheritIcon" = false WHERE "name" = 'Generic';
