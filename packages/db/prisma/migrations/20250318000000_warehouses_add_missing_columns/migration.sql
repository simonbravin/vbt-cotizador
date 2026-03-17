-- Ensure warehouses has all columns expected by Prisma (production may have been created without some)
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "country_code" TEXT;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "manager_name" TEXT;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "contact_phone" TEXT;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "contact_email" TEXT;
