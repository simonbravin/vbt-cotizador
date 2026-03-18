-- Ensure warehouses timestamps exist and have defaults.
-- Idempotent: works whether or not 20250319 was applied (ADD COLUMN IF NOT EXISTS),
-- and sets DEFAULT on existing columns (ALTER COLUMN SET DEFAULT).

ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "warehouses" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "warehouses" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
