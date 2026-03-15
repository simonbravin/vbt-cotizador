-- Normalizar org_members para que las columnas coincidan con lo que espera Prisma (@map).
-- Si la tabla tiene organizationId/userId (camelCase), renombrar a organization_id/user_id.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'org_members' AND column_name = 'organizationId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'org_members' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE org_members RENAME COLUMN "organizationId" TO organization_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'org_members' AND column_name = 'userId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'org_members' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE org_members RENAME COLUMN "userId" TO user_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'org_members' AND column_name = 'invitedByUserId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'org_members' AND column_name = 'invited_by_user_id'
  ) THEN
    ALTER TABLE org_members RENAME COLUMN "invitedByUserId" TO invited_by_user_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'org_members' AND column_name = 'joinedAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'org_members' AND column_name = 'joined_at'
  ) THEN
    ALTER TABLE org_members RENAME COLUMN "joinedAt" TO joined_at;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'org_members' AND column_name = 'lastActiveAt'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'org_members' AND column_name = 'last_active_at'
  ) THEN
    ALTER TABLE org_members RENAME COLUMN "lastActiveAt" TO last_active_at;
  END IF;
END $$;
