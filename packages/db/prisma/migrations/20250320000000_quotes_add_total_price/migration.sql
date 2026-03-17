-- Production may lack total_price on quotes / quote_items. Ensure they exist.
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "total_price" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "quote_items" ADD COLUMN IF NOT EXISTS "total_price" DOUBLE PRECISION NOT NULL DEFAULT 0;
