ALTER TABLE "attachments"
  DROP CONSTRAINT IF EXISTS "attachments_event_id_fkey";

DROP INDEX IF EXISTS "idx_attachments_event";

ALTER TABLE "attachments"
  RENAME COLUMN "event_id" TO "daily_log_event_id";

ALTER TABLE "attachments"
  ADD CONSTRAINT "attachments_daily_log_event_id_fkey"
  FOREIGN KEY ("daily_log_event_id") REFERENCES "daily_log_events"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_attachments_daily_log_event"
  ON "attachments"("daily_log_event_id");
