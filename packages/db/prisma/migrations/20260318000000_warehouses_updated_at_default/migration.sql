-- Ensure warehouses timestamps have defaults.
-- Some Neon environments can end up with columns defined as NOT NULL without DEFAULT,
-- causing Prisma creates to fail with "Null constraint violation on the fields: (updatedAt)".

ALTER TABLE "warehouses"
  ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "warehouses"
  ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;

