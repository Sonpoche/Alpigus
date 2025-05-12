-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "acceptDeferred" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minOrderQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0;
