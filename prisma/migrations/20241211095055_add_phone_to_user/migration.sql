-- AlterTable
ALTER TABLE "Producer" DROP COLUMN "phone",
ALTER COLUMN "companyName" DROP NOT NULL,
ALTER COLUMN "address" DROP NOT NULL;

-- Ajouter la colonne phone comme nullable d'abord
ALTER TABLE "User" ADD COLUMN "phone" TEXT;

-- Mettre à jour les utilisateurs existants
UPDATE "User" SET "phone" = '+0000000000' WHERE "phone" IS NULL;

-- Rendre la colonne non nullable
ALTER TABLE "User" ALTER COLUMN "phone" SET NOT NULL;