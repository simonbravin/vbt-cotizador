-- Normalize clients table: Prisma expects organization_id (and other snake_case).
-- If Neon has organizationId (camelCase), rename so Prisma queries work.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'organizationId')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'organization_id') THEN
    ALTER TABLE clients RENAME COLUMN "organizationId" TO organization_id;
  END IF;
END $$;
