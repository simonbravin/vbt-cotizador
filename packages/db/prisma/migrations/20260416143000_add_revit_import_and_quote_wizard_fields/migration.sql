-- Revit CSV imports + quote wizard snapshot fields

CREATE TABLE "revit_imports" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT,
    "filename" TEXT NOT NULL,
    "uploaded_by_user_id" TEXT,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "matched_count" INTEGER NOT NULL DEFAULT 0,
    "unmapped_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revit_imports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "revit_import_lines" (
    "id" TEXT NOT NULL,
    "import_id" TEXT NOT NULL,
    "row_num" INTEGER NOT NULL,
    "raw_piece_code" TEXT,
    "raw_piece_name" TEXT NOT NULL,
    "raw_qty" DOUBLE PRECISION NOT NULL,
    "raw_height_mm" DOUBLE PRECISION NOT NULL,
    "catalog_piece_id" TEXT,
    "match_method" TEXT,
    "is_ignored" BOOLEAN NOT NULL DEFAULT false,
    "linear_m" DOUBLE PRECISION,
    "linear_ft" DOUBLE PRECISION,
    "m2_line" DOUBLE PRECISION,
    "weight_lbs_cored" DOUBLE PRECISION,
    "weight_lbs_uncored" DOUBLE PRECISION,
    "weight_kg_cored" DOUBLE PRECISION,
    "weight_kg_uncored" DOUBLE PRECISION,
    "volume_m3" DOUBLE PRECISION,
    "price_per_m" DOUBLE PRECISION,
    "price_per_ft" DOUBLE PRECISION,
    "line_total" DOUBLE PRECISION,
    "markup_pct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "line_total_with_markup" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revit_import_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "revit_imports_organization_id_idx" ON "revit_imports"("organization_id");
CREATE INDEX "revit_imports_project_id_idx" ON "revit_imports"("project_id");

CREATE INDEX "revit_import_lines_import_id_idx" ON "revit_import_lines"("import_id");
CREATE INDEX "revit_import_lines_catalog_piece_id_idx" ON "revit_import_lines"("catalog_piece_id");

ALTER TABLE "revit_imports" ADD CONSTRAINT "revit_imports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "revit_imports" ADD CONSTRAINT "revit_imports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "revit_imports" ADD CONSTRAINT "revit_imports_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "revit_import_lines" ADD CONSTRAINT "revit_import_lines_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "revit_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "revit_import_lines" ADD CONSTRAINT "revit_import_lines_catalog_piece_id_fkey" FOREIGN KEY ("catalog_piece_id") REFERENCES "catalog_pieces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quotes" ADD COLUMN "revit_import_id" TEXT;
ALTER TABLE "quotes" ADD COLUMN "quote_cost_method" TEXT;
ALTER TABLE "quotes" ADD COLUMN "wall_area_m2_s80" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "quotes" ADD COLUMN "wall_area_m2_s150" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "quotes" ADD COLUMN "wall_area_m2_s200" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "quotes" ADD COLUMN "wall_area_m2_total" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "quotes" ADD COLUMN "total_kits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "quotes" ADD COLUMN "num_containers" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "quotes" ADD COLUMN "kits_per_container" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "quotes" ADD COLUMN "total_weight_kg" DOUBLE PRECISION;
ALTER TABLE "quotes" ADD COLUMN "total_volume_m3" DOUBLE PRECISION;
ALTER TABLE "quotes" ADD COLUMN "concrete_m3" DOUBLE PRECISION;
ALTER TABLE "quotes" ADD COLUMN "steel_kg_est" DOUBLE PRECISION;

CREATE INDEX "quotes_revit_import_id_idx" ON "quotes"("revit_import_id");

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_revit_import_id_fkey" FOREIGN KEY ("revit_import_id") REFERENCES "revit_imports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
