-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "checksum_sha256" CHAR(64),
ADD COLUMN     "extension" VARCHAR(20),
ADD COLUMN     "is_inline_preview_allowed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "original_filename" VARCHAR(250),
ADD COLUMN     "sanitized_filename" VARCHAR(250),
ADD COLUMN     "size_bytes" INTEGER,
ADD COLUMN     "storage_path" TEXT,
ADD COLUMN     "storage_provider" VARCHAR(50) NOT NULL DEFAULT 'local',
ADD COLUMN     "uploaded_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "attachments"
SET
  "original_filename" = COALESCE("original_filename", "original_name"),
  "sanitized_filename" = COALESCE("sanitized_filename", "filename"),
  "extension" = COALESCE(
    "extension",
    NULLIF(LOWER(REGEXP_REPLACE("original_name", '^.*\.', '')), LOWER("original_name"))
  ),
  "size_bytes" = COALESCE("size_bytes", "size"),
  "storage_path" = COALESCE("storage_path", "path"),
  "uploaded_at" = COALESCE("uploaded_at", "created_at"),
  "is_inline_preview_allowed" = "mime_type" IN ('image/jpeg', 'image/png', 'application/pdf');

-- AlterTable
ALTER TABLE "daily_log_events" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "daily_log_status_history" ALTER COLUMN "id" DROP DEFAULT;
