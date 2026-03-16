-- CreateTable warehouses (per-organization, for partner and superadmin inventory)
CREATE TABLE IF NOT EXISTS "warehouses" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- Add organization_id if table existed without it (e.g. legacy)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'warehouses' AND column_name = 'organization_id') THEN
    ALTER TABLE "warehouses" ADD COLUMN "organization_id" TEXT;
  END IF;
END $$;

-- Create index only if column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'warehouses' AND column_name = 'organization_id') THEN
    CREATE INDEX IF NOT EXISTS "warehouses_organization_id_idx" ON "warehouses"("organization_id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND table_name = 'warehouses' AND constraint_name = 'warehouses_organization_id_fkey'
  ) AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'warehouses' AND column_name = 'organization_id') THEN
    ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
