ALTER TYPE "audit_action" ADD VALUE IF NOT EXISTS 'DAILY_LOG_SIGNATURE_APPLIED';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'daily_log_signature_type') THEN
    CREATE TYPE "daily_log_signature_type" AS ENUM ('RESPONSIBLE', 'APPROVER', 'INSPECTOR');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "daily_log_signatures" (
  "id" UUID NOT NULL,
  "daily_log_id" UUID NOT NULL,
  "signer_user_id" UUID NOT NULL,
  "signer_name" VARCHAR(200) NOT NULL,
  "signer_email" VARCHAR(150) NOT NULL,
  "signer_role" VARCHAR(120) NOT NULL,
  "signature_type" "daily_log_signature_type" NOT NULL,
  "signature_snapshot_path" TEXT NOT NULL,
  "signature_snapshot_mime_type" VARCHAR(120) NOT NULL,
  "signature_snapshot_file_name" VARCHAR(250) NOT NULL,
  "signature_snapshot_file_size" BIGINT NOT NULL,
  "signed_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ip_address" VARCHAR(80),
  "user_agent" TEXT,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "daily_log_signatures_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uq_daily_log_signatures_type"
  ON "daily_log_signatures"("daily_log_id", "signature_type");

CREATE INDEX IF NOT EXISTS "idx_daily_log_signatures_log"
  ON "daily_log_signatures"("daily_log_id");

CREATE INDEX IF NOT EXISTS "idx_daily_log_signatures_signer"
  ON "daily_log_signatures"("signer_user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_log_signatures_daily_log_id_fkey'
  ) THEN
    ALTER TABLE "daily_log_signatures"
      ADD CONSTRAINT "daily_log_signatures_daily_log_id_fkey"
      FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_log_signatures_signer_user_id_fkey'
  ) THEN
    ALTER TABLE "daily_log_signatures"
      ADD CONSTRAINT "daily_log_signatures_signer_user_id_fkey"
      FOREIGN KEY ("signer_user_id") REFERENCES "users"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
