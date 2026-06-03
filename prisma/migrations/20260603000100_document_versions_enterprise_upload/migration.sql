-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "audit_action" ADD VALUE 'DOCUMENT_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'DOCUMENT_VERSION_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'DOCUMENT_DOWNLOADED';

-- AlterTable
ALTER TABLE "document_versions" ADD COLUMN     "extension" VARCHAR(20),
ADD COLUMN     "is_current_version" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "original_file_name" VARCHAR(250),
ADD COLUMN     "storage_path" TEXT;
