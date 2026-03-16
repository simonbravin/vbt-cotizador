-- Catalog stores cost per m² of wall (USD/m² cored), not per linear meter (we don't have $/m linear).
ALTER TABLE "catalog_pieces" RENAME COLUMN "price_per_m_cored" TO "price_per_m2_cored";
