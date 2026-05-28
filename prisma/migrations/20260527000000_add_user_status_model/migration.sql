-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING_ACTIVATION');

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "users"
ALTER COLUMN "status" TYPE "user_status"
USING (
  CASE
    WHEN "status"::text = 'DELETED' THEN 'INACTIVE'
    ELSE "status"::text
  END
)::"user_status";

ALTER TABLE "users" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

ALTER TABLE "users" ADD COLUMN "status_changed_at" TIMESTAMP(6);
ALTER TABLE "users" ADD COLUMN "status_changed_by" UUID;
ALTER TABLE "users" ADD COLUMN "blocked_reason" TEXT;
ALTER TABLE "users" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;
