-- Multi-project sales: baseline quote on project + sale_project_lines; backfill from sales.

ALTER TABLE "projects" ADD COLUMN "baseline_quote_id" TEXT;

CREATE UNIQUE INDEX "projects_baseline_quote_id_key" ON "projects"("baseline_quote_id");

ALTER TABLE "projects" ADD CONSTRAINT "projects_baseline_quote_id_fkey" FOREIGN KEY ("baseline_quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "sale_project_lines" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "quote_id" TEXT,
    "container_share_pct" DOUBLE PRECISION,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_project_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sale_project_lines_sale_id_project_id_key" ON "sale_project_lines"("sale_id", "project_id");
CREATE INDEX "sale_project_lines_sale_id_idx" ON "sale_project_lines"("sale_id");
CREATE INDEX "sale_project_lines_project_id_idx" ON "sale_project_lines"("project_id");
CREATE INDEX "sale_project_lines_quote_id_idx" ON "sale_project_lines"("quote_id");

ALTER TABLE "sale_project_lines" ADD CONSTRAINT "sale_project_lines_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sale_project_lines" ADD CONSTRAINT "sale_project_lines_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sale_project_lines" ADD CONSTRAINT "sale_project_lines_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "sale_project_lines" ("id", "sale_id", "project_id", "quote_id", "container_share_pct", "sort_order", "created_at", "updated_at")
SELECT
    md5(random()::text || clock_timestamp()::text || s."id" || s."project_id"),
    s."id",
    s."project_id",
    s."quote_id",
    NULL,
    0,
    s."created_at",
    s."updated_at"
FROM "sales" s;
