-- Normalize projects table: Prisma expects organization_id and client_id (snake_case).
-- Neon may have organizationId and clientId (camelCase). Rename so Prisma queries work.

-- organizationId -> organization_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'organizationId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE projects RENAME COLUMN "organizationId" TO organization_id;
  END IF;
END $$;

-- clientId -> client_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'clientId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE projects RENAME COLUMN "clientId" TO client_id;
  END IF;
END $$;
