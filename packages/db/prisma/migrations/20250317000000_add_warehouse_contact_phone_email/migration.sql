-- AlterTable: add contact_phone, contact_email to warehouses
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "contact_phone" TEXT;
ALTER TABLE "warehouses" ADD COLUMN IF NOT EXISTS "contact_email" TEXT;
