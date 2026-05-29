-- CreateEnum
CREATE TYPE "document_type" AS ENUM (
  'PLANO',
  'SOLICITUD_SUSPENSION',
  'DENUNCIA',
  'DEMANDA',
  'ACTA',
  'SOPORTE_FOTOGRAFICO',
  'CONTRATO',
  'OTRO'
);

-- CreateEnum
CREATE TYPE "document_status" AS ENUM (
  'ACTIVE',
  'ARCHIVED',
  'DELETED'
);

-- AlterEnum
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'CREATE_DOCUMENT';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'UPDATE_DOCUMENT';
ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'DELETE_DOCUMENT';

-- AlterTable
ALTER TABLE "documents"
  ADD COLUMN "organization_id" UUID,
  ADD COLUMN "daily_log_id" UUID,
  ADD COLUMN "event_id" UUID,
  ADD COLUMN "type" "document_type" NOT NULL DEFAULT 'OTRO',
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "deleted_at" TIMESTAMP(6),
  ADD COLUMN "document_status_new" "document_status" NOT NULL DEFAULT 'ACTIVE';

UPDATE "documents" AS d
SET
  "organization_id" = p."organization_id",
  "document_status_new" = CASE d."status"::text
    WHEN 'DELETED' THEN 'DELETED'::"document_status"
    WHEN 'INACTIVE' THEN 'ARCHIVED'::"document_status"
    ELSE 'ACTIVE'::"document_status"
  END
FROM "projects" AS p
WHERE d."project_id" = p."id";

ALTER TABLE "documents"
  ALTER COLUMN "organization_id" SET NOT NULL,
  DROP COLUMN "status";

ALTER TABLE "documents"
  RENAME COLUMN "document_status_new" TO "status";

-- AddForeignKey
ALTER TABLE "documents"
  ADD CONSTRAINT "documents_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_daily_log_id_fkey"
  FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "documents"
  ADD CONSTRAINT "documents_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "events"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "idx_documents_organization" ON "documents"("organization_id");
CREATE INDEX "idx_documents_daily_log" ON "documents"("daily_log_id");
CREATE INDEX "idx_documents_event" ON "documents"("event_id");
CREATE INDEX "idx_documents_control_type" ON "documents"("type");
CREATE INDEX "idx_documents_status" ON "documents"("status");
