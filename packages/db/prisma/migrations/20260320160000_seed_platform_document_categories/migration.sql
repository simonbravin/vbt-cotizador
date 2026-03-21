-- Platform document library: default categories (idempotent on `code`).
INSERT INTO "document_categories" ("id", "name", "code", "description", "sort_order")
VALUES
  ('doccat_constructive', 'Detalles constructivos', 'constructive_details', NULL, 10),
  ('doccat_guides', 'Guías y manuales', 'guides', NULL, 20),
  ('doccat_approvals', 'Aprobaciones y certificaciones', 'approvals', NULL, 30),
  ('doccat_technical', 'Especificaciones técnicas', 'technical_specs', NULL, 40),
  ('doccat_legal_commercial', 'Legal y comercial', 'legal_commercial', NULL, 50)
ON CONFLICT ("code") DO NOTHING;
