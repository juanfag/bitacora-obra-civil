-- CreateEnum
CREATE TYPE "record_status" AS ENUM ('ACTIVE', 'INACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "attachment_requirement" AS ENUM ('REQUIRED', 'OPTIONAL', 'NOT_REQUIRED');

-- CreateEnum
CREATE TYPE "project_status" AS ENUM ('PLANNED', 'ACTIVE', 'SUSPENDED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "daily_log_status" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'OBSERVED', 'APPROVED', 'PDF_GENERATED', 'SIGNED', 'CLOSED', 'VOIDED');

-- CreateEnum
CREATE TYPE "event_status" AS ENUM ('DRAFT', 'SUBMITTED', 'OBSERVED', 'APPROVED', 'REJECTED', 'VOIDED');

-- CreateEnum
CREATE TYPE "signature_type" AS ENUM ('DRAWN', 'DIGITAL', 'CERTIFICATE', 'OTP');

-- CreateEnum
CREATE TYPE "approval_action" AS ENUM ('APPROVED', 'REJECTED', 'OBSERVED');

-- CreateEnum
CREATE TYPE "document_storage_provider" AS ENUM ('LOCAL', 'GOOGLE_DRIVE', 'S3', 'AZURE_BLOB');

-- CreateEnum
CREATE TYPE "daily_log_document_role" AS ENUM ('SUPPORT', 'GENERATED_PDF', 'SIGNED_PDF');

-- CreateEnum
CREATE TYPE "pdf_version_status" AS ENUM ('GENERATED', 'SIGNED', 'VOIDED');

-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'SUBMIT', 'APPROVE', 'REJECT', 'OBSERVE', 'SIGN', 'UPLOAD_DOCUMENT', 'GENERATE_PDF', 'CLOSE', 'VOID');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "nit" VARCHAR(50),
    "email" VARCHAR(150),
    "phone" VARCHAR(50),
    "status" "record_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(200) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(50),
    "document_type" VARCHAR(30),
    "document_number" VARCHAR(50),
    "status" "record_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "status" "record_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "status" "record_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "start_date" DATE,
    "end_date" DATE,
    "status" "project_status" NOT NULL DEFAULT 'PLANNED',
    "created_by" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_users" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "status" "record_status" NOT NULL DEFAULT 'ACTIVE',
    "assigned_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" UUID,

    CONSTRAINT "project_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_types" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "attachment_requirement" "attachment_requirement" NOT NULL DEFAULT 'OPTIONAL',
    "requires_signature" BOOLEAN NOT NULL DEFAULT true,
    "status" "record_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_types" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "status" "record_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_logs" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "log_date" DATE NOT NULL,
    "status" "daily_log_status" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID NOT NULL,
    "reviewed_by" UUID,
    "approved_by" UUID,
    "submitted_at" TIMESTAMP(6),
    "reviewed_at" TIMESTAMP(6),
    "approved_at" TIMESTAMP(6),
    "closed_at" TIMESTAMP(6),
    "comments" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "daily_log_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "event_type_id" UUID NOT NULL,
    "activity" TEXT NOT NULL,
    "execution_description" TEXT NOT NULL,
    "event_datetime" TIMESTAMP(6) NOT NULL,
    "reported_by" UUID NOT NULL,
    "status" "event_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_versions" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "event_type_id" UUID NOT NULL,
    "activity" TEXT NOT NULL,
    "execution_description" TEXT NOT NULL,
    "status" "event_status" NOT NULL,
    "changed_by" UUID NOT NULL,
    "change_reason" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_signatures" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "signed_by" UUID NOT NULL,
    "signature_type" "signature_type" NOT NULL DEFAULT 'DRAWN',
    "signature_url" TEXT,
    "signature_hash" TEXT,
    "signed_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" VARCHAR(80),
    "device_info" TEXT,

    CONSTRAINT "event_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_log_approvals" (
    "id" UUID NOT NULL,
    "daily_log_id" UUID NOT NULL,
    "approver_id" UUID NOT NULL,
    "action" "approval_action" NOT NULL,
    "comments" TEXT,
    "signature_type" "signature_type" DEFAULT 'DRAWN',
    "signature_url" TEXT,
    "signature_hash" TEXT,
    "signed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_log_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "document_type_id" UUID NOT NULL,
    "uploaded_by" UUID NOT NULL,
    "title" VARCHAR(250) NOT NULL,
    "description" TEXT,
    "file_name" VARCHAR(250) NOT NULL,
    "file_url" TEXT NOT NULL,
    "storage_provider" "document_storage_provider" NOT NULL DEFAULT 'LOCAL',
    "mime_type" VARCHAR(120),
    "file_size" BIGINT,
    "file_hash" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "record_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_documents" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_log_documents" (
    "id" UUID NOT NULL,
    "daily_log_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "document_role" "daily_log_document_role" NOT NULL DEFAULT 'SUPPORT',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_log_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_log_pdf_versions" (
    "id" UUID NOT NULL,
    "daily_log_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "generated_by" UUID NOT NULL,
    "generated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "pdf_version_status" NOT NULL DEFAULT 'GENERATED',

    CONSTRAINT "daily_log_pdf_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "entity_name" VARCHAR(100) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" "audit_action" NOT NULL,
    "performed_by" UUID,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" VARCHAR(80),
    "device_info" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_organizations_nit" ON "organizations"("nit");

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_email" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "uq_users_document" ON "users"("document_type", "document_number");

-- CreateIndex
CREATE UNIQUE INDEX "uq_roles_code" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_permissions_code" ON "permissions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_role_permissions" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "idx_projects_organization" ON "projects"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_projects_org_code" ON "projects"("organization_id", "code");

-- CreateIndex
CREATE INDEX "idx_project_users_project" ON "project_users"("project_id");

-- CreateIndex
CREATE INDEX "idx_project_users_user" ON "project_users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_project_user_role" ON "project_users"("project_id", "user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_event_types_code" ON "event_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_document_types_code" ON "document_types"("code");

-- CreateIndex
CREATE INDEX "idx_daily_logs_project_date" ON "daily_logs"("project_id", "log_date");

-- CreateIndex
CREATE INDEX "idx_daily_logs_status" ON "daily_logs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_daily_logs_project_date" ON "daily_logs"("project_id", "log_date");

-- CreateIndex
CREATE INDEX "idx_events_daily_log" ON "events"("daily_log_id");

-- CreateIndex
CREATE INDEX "idx_events_project_date" ON "events"("project_id", "event_datetime");

-- CreateIndex
CREATE INDEX "idx_events_reported_by" ON "events"("reported_by");

-- CreateIndex
CREATE INDEX "idx_events_status" ON "events"("status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_event_versions" ON "event_versions"("event_id", "version_number");

-- CreateIndex
CREATE UNIQUE INDEX "uq_event_signature" ON "event_signatures"("event_id", "signed_by");

-- CreateIndex
CREATE INDEX "idx_documents_project" ON "documents"("project_id");

-- CreateIndex
CREATE INDEX "idx_documents_type" ON "documents"("document_type_id");

-- CreateIndex
CREATE INDEX "idx_event_documents_event" ON "event_documents"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_event_documents" ON "event_documents"("event_id", "document_id");

-- CreateIndex
CREATE INDEX "idx_daily_log_documents_log" ON "daily_log_documents"("daily_log_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_daily_log_documents" ON "daily_log_documents"("daily_log_id", "document_id", "document_role");

-- CreateIndex
CREATE UNIQUE INDEX "uq_daily_log_pdf_versions" ON "daily_log_pdf_versions"("daily_log_id", "version_number");

-- CreateIndex
CREATE INDEX "idx_audit_logs_entity" ON "audit_logs"("entity_name", "entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_performed_by" ON "audit_logs"("performed_by");

-- CreateIndex
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_users" ADD CONSTRAINT "project_users_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_users" ADD CONSTRAINT "project_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_users" ADD CONSTRAINT "project_users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_users" ADD CONSTRAINT "project_users_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "event_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_versions" ADD CONSTRAINT "event_versions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_versions" ADD CONSTRAINT "event_versions_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "event_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_versions" ADD CONSTRAINT "event_versions_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_signatures" ADD CONSTRAINT "event_signatures_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_signatures" ADD CONSTRAINT "event_signatures_signed_by_fkey" FOREIGN KEY ("signed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_log_approvals" ADD CONSTRAINT "daily_log_approvals_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_log_approvals" ADD CONSTRAINT "daily_log_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_documents" ADD CONSTRAINT "event_documents_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_documents" ADD CONSTRAINT "event_documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_log_documents" ADD CONSTRAINT "daily_log_documents_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_log_documents" ADD CONSTRAINT "daily_log_documents_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_log_pdf_versions" ADD CONSTRAINT "daily_log_pdf_versions_daily_log_id_fkey" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_log_pdf_versions" ADD CONSTRAINT "daily_log_pdf_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_log_pdf_versions" ADD CONSTRAINT "daily_log_pdf_versions_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
