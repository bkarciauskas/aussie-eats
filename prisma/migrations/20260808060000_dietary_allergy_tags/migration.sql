-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN "dietaryTags" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN "dietaryTags" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN "allergens" TEXT NOT NULL DEFAULT '[]';
