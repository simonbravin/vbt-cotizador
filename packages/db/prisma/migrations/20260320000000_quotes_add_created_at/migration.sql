-- Ensure quotes has created_at (idempotent).
-- Fixes "The column quotes.created_at does not exist" when table was created by another path.

ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
