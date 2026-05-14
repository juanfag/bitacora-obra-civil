-- Organizations actor columns
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "updated_by" UUID;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "deleted_by" UUID;

-- Projects actor columns
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "updated_by" UUID;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "deleted_by" UUID;

-- Daily logs actor columns
ALTER TABLE "daily_logs" ADD COLUMN IF NOT EXISTS "updated_by" UUID;
ALTER TABLE "daily_logs" ADD COLUMN IF NOT EXISTS "deleted_by" UUID;

-- Events actor columns
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "updated_by" UUID;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "deleted_by" UUID;

-- Attachments actor columns
ALTER TABLE "attachments" ADD COLUMN IF NOT EXISTS "created_by" UUID;
ALTER TABLE "attachments" ADD COLUMN IF NOT EXISTS "updated_by" UUID;
ALTER TABLE "attachments" ADD COLUMN IF NOT EXISTS "deleted_by" UUID;

-- Foreign keys
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "projects" ADD CONSTRAINT "projects_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "events" ADD CONSTRAINT "events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "attachments" ADD CONSTRAINT "attachments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
