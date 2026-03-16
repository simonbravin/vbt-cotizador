-- Ensure quotes, projects, clients have organization_id (Neon may have had tables from before multitenant).
-- Add column if missing so Prisma queries and cleanup script work.

-- quotes.organization_id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'organization_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'organizationId') THEN
      ALTER TABLE "quotes" RENAME COLUMN "organizationId" TO organization_id;
    ELSE
      ALTER TABLE "quotes" ADD COLUMN organization_id TEXT;
      UPDATE "quotes" SET organization_id = (SELECT id FROM organizations LIMIT 1) WHERE organization_id IS NULL;
      ALTER TABLE "quotes" ALTER COLUMN organization_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- projects.organization_id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'organization_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'organizationId') THEN
      ALTER TABLE "projects" RENAME COLUMN "organizationId" TO organization_id;
    ELSE
      ALTER TABLE "projects" ADD COLUMN organization_id TEXT;
      UPDATE "projects" SET organization_id = (SELECT id FROM organizations LIMIT 1) WHERE organization_id IS NULL;
      ALTER TABLE "projects" ALTER COLUMN organization_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- clients.organization_id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'organization_id') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'organizationId') THEN
      ALTER TABLE "clients" RENAME COLUMN "organizationId" TO organization_id;
    ELSE
      ALTER TABLE "clients" ADD COLUMN organization_id TEXT;
      UPDATE "clients" SET organization_id = (SELECT id FROM organizations LIMIT 1) WHERE organization_id IS NULL;
      ALTER TABLE "clients" ALTER COLUMN organization_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- Indexes and FK if missing (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'quotes_organization_id_idx') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'organization_id') THEN
    CREATE INDEX "quotes_organization_id_idx" ON "quotes"("organization_id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'quotes_organization_id_fkey' AND table_name = 'quotes') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'quotes' AND column_name = 'organization_id') THEN
    ALTER TABLE "quotes" ADD CONSTRAINT "quotes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
