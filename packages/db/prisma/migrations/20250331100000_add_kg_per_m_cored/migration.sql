-- Add kg per linear meter cored (1 lb = 0.453592 kg). Optional override; can be derived from lbs_per_m_cored.
ALTER TABLE "catalog_pieces" ADD COLUMN IF NOT EXISTS "kg_per_m_cored" DOUBLE PRECISION;

UPDATE "catalog_pieces"
SET "kg_per_m_cored" = "lbs_per_m_cored" * 0.453592
WHERE "lbs_per_m_cored" IS NOT NULL AND "kg_per_m_cored" IS NULL;
