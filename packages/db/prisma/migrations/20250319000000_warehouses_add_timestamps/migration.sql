-- Production warehouses may lack created_at/updated_at (or other columns). Ensure all exist.
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "country_code" TEXT;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "manager_name" TEXT;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "contact_phone" TEXT;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "contact_email" TEXT;
