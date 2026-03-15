-- Ajustar org_members a lo que espera Prisma: la tabla en Neon tiene "orgId", no "organization_id".
-- Renombrar orgId -> organization_id, añadir columnas faltantes y normalizar role (SUPERADMIN/ADMIN -> org_admin).

-- 1) Renombrar orgId a organization_id (si existe orgId y no existe organization_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'org_members' AND column_name = 'orgId'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'org_members' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE org_members RENAME COLUMN "orgId" TO organization_id;
  END IF;
END $$;

-- 2) Añadir columnas que espera Prisma si no existen
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS status "OrgMemberStatus" NOT NULL DEFAULT 'active';
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS invited_by_user_id TEXT;
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP(3);
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP(3);

-- (Opcional: si en Neon role es TEXT o tiene valores SUPERADMIN/ADMIN, normalizar en una migración posterior.)
