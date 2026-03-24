-- Certificate public verification code + statement snapshots; optional copy per quiz/program

ALTER TABLE "training_certificates" ADD COLUMN "verify_public_code" TEXT;
ALTER TABLE "training_certificates" ADD COLUMN "statement_primary_snapshot" TEXT;
ALTER TABLE "training_certificates" ADD COLUMN "statement_secondary_snapshot" TEXT;

-- gen_random_bytes requiere pgcrypto; gen_random_uuid() está en el núcleo (PG 13+)
UPDATE "training_certificates"
SET "verify_public_code" = replace(gen_random_uuid()::text, '-', '')
WHERE "verify_public_code" IS NULL;

ALTER TABLE "training_certificates" ALTER COLUMN "verify_public_code" SET NOT NULL;

CREATE UNIQUE INDEX "training_certificates_verify_public_code_key" ON "training_certificates"("verify_public_code");

ALTER TABLE "quiz_definitions" ADD COLUMN "certificate_statement_primary" TEXT;
ALTER TABLE "quiz_definitions" ADD COLUMN "certificate_statement_secondary" TEXT;

ALTER TABLE "training_programs" ADD COLUMN "certificate_statement_primary" TEXT;
ALTER TABLE "training_programs" ADD COLUMN "certificate_statement_secondary" TEXT;
