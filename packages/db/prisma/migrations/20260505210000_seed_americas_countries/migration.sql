-- Idempotent seed: core Americas ISO2 rows for partner country dropdowns, tax rule FKs, and freight.
-- Matches apps/web STATIC_COUNTRIES; skips rows that already exist (by code).
INSERT INTO "countries" ("id", "code", "name", "currency", "is_active", "created_at", "updated_at")
SELECT gen_random_uuid()::text, v.code, v.name, 'USD', true, NOW(), NOW()
FROM (VALUES
  ('AR', 'Argentina'),
  ('BO', 'Bolivia'),
  ('BR', 'Brazil'),
  ('CL', 'Chile'),
  ('CO', 'Colombia'),
  ('CR', 'Costa Rica'),
  ('EC', 'Ecuador'),
  ('SV', 'El Salvador'),
  ('GT', 'Guatemala'),
  ('HN', 'Honduras'),
  ('MX', 'Mexico'),
  ('NI', 'Nicaragua'),
  ('PA', 'Panama'),
  ('PY', 'Paraguay'),
  ('PE', 'Peru'),
  ('UY', 'Uruguay'),
  ('US', 'United States'),
  ('VE', 'Venezuela')
) AS v("code", "name")
WHERE NOT EXISTS (SELECT 1 FROM "countries" c WHERE c."code" = v."code");
