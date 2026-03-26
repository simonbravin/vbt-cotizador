-- Client fiscal / location fields (UI already collected; API previously dropped them)
ALTER TABLE "clients" ADD COLUMN "legal_name" TEXT;
ALTER TABLE "clients" ADD COLUMN "tax_id" TEXT;
ALTER TABLE "clients" ADD COLUMN "address" TEXT;
