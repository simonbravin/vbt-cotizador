-- Add missing enum values used by the app (idempotent).
-- Fixes "invalid input value for enum ProjectStatus: lost" and "QuoteStatus: sent"
-- when DB enum was created with fewer values.

DO $$ BEGIN
  ALTER TYPE "ProjectStatus" ADD VALUE 'lost';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "QuoteStatus" ADD VALUE 'sent';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
