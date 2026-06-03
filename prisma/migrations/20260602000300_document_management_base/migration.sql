-- CreateEnum
CREATE TYPE "document_visibility" AS ENUM ('PRIVATE', 'PROJECT', 'ORGANIZATION', 'PUBLIC_VERIFICATION', 'RESTRICTED');

-- CreateEnum
CREATE TYPE "document_relation_type" AS ENUM ('PRIMARY', 'SUPPORT', 'EVIDENCE', 'GENERATED_PDF', 'SIGNED_PDF', 'CONTRACT', 'DESIGN_PLAN', 'PHOTO_SUPPORT', 'LEGAL_SUPPORT', 'REFERENCE', 'REPLACES', 'SUPERSEDES');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "document_status" ADD VALUE 'DRAFT';
ALTER TYPE "document_status" ADD VALUE 'IN_REVIEW';
ALTER TYPE "document_status" ADD VALUE 'APPROVED';
ALTER TYPE "document_status" ADD VALUE 'REJECTED';
ALTER TYPE "document_status" ADD VALUE 'SUPERSEDED';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "category_id" UUID,
ADD COLUMN     "code" VARCHAR(80),
ADD COLUMN     "created_by" UUID,
ADD COLUMN     "current_version_id" UUID,
ADD COLUMN     "deleted_by" UUID,
ADD COLUMN     "updated_by" UUID,
ADD COLUMN     "visibility" "document_visibility" NOT NULL DEFAULT 'PROJECT';

-- CreateTable
CREATE TABLE "document_categories" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "project_id" UUID,
    "parent_id" UUID,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "status" "record_status" NOT NULL DEFAULT 'ACTIVE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "file_name" VARCHAR(250) NOT NULL,
    "original_name" VARCHAR(250),
    "mime_type" VARCHAR(120),
    "size_bytes" BIGINT,
    "checksum_sha256" CHAR(64),
    "storage_provider" "document_storage_provider" NOT NULL DEFAULT 'LOCAL',
    "storage_bucket" VARCHAR(200),
    "storage_key" TEXT NOT NULL,
    "storage_url" TEXT,
    "etag" VARCHAR(250),
    "uploaded_by" UUID NOT NULL,
    "change_reason" TEXT,
    "metadata" JSONB,
    "deleted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_relations" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "relation_type" "document_relation_type" NOT NULL,
    "organization_id" UUID,
    "project_id" UUID,
    "daily_log_id" UUID,
    "daily_log_event_id" UUID,
    "related_document_id" UUID,
    "metadata" JSONB,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_relations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_document_categories_organization" ON "document_categories"("organization_id");

-- CreateIndex
CREATE INDEX "idx_document_categories_project" ON "document_categories"("project_id");

-- CreateIndex
CREATE INDEX "idx_document_categories_parent" ON "document_categories"("parent_id");

-- CreateIndex
CREATE INDEX "idx_document_categories_status" ON "document_categories"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_document_categories_scope_code" ON "document_categories"("organization_id", "project_id", "code");

-- CreateIndex
CREATE INDEX "idx_document_versions_document" ON "document_versions"("document_id");

-- CreateIndex
CREATE INDEX "idx_document_versions_checksum" ON "document_versions"("checksum_sha256");

-- CreateIndex
CREATE INDEX "idx_document_versions_uploaded_by" ON "document_versions"("uploaded_by");

-- CreateIndex
CREATE UNIQUE INDEX "uq_document_versions_number" ON "document_versions"("document_id", "version_number");

-- CreateIndex
CREATE INDEX "idx_document_relations_document" ON "document_relations"("document_id");

-- CreateIndex
CREATE INDEX "idx_document_relations_related_document" ON "document_relations"("related_document_id");

-- CreateIndex
CREATE INDEX "idx_document_relations_organization" ON "document_relations"("organization_id");

-- CreateIndex
CREATE INDEX "idx_document_relations_project" ON "document_relations"("project_id");

-- CreateIndex
CREATE INDEX "idx_document_relations_daily_log" ON "document_relations"("daily_log_id");

-- CreateIndex
CREATE INDEX "idx_document_relations_daily_log_event" ON "document_relations"("daily_log_event_id");

-- CreateIndex
CREATE INDEX "idx_document_relations_type" ON "document_relations"("relation_type");

-- CreateIndex
CREATE UNIQUE INDEX "uq_documents_current_version" ON "documents"("current_version_id");

-- CreateIndex
CREATE INDEX "idx_documents_category" ON "documents"("category_id");

-- CreateIndex
CREATE INDEX "idx_documents_visibility" ON "documents"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX "uq_documents_project_code" ON "documents"("project_id", "code");

-- AddForeignKey
ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "document_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "document_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "document_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_relations" ADD CONSTRAINT "document_relations_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_relations" ADD CONSTRAINT "document_relations_related_document_id_fkey" FOREIGN KEY ("related_document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_relations" ADD CONSTRAINT "document_relations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_relations" ADD CONSTRAINT "document_relations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_relations" ADD CONSTRAINT "document_relations_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_relations" ADD CONSTRAINT "document_relations_daily_log_event_id_fkey" FOREIGN KEY ("daily_log_event_id") REFERENCES "daily_log_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_relations" ADD CONSTRAINT "document_relations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
