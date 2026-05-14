CREATE TABLE IF NOT EXISTS "daily_log_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "daily_log_id" UUID NOT NULL,
  "event_type_id" UUID NOT NULL,
  "activity" TEXT NOT NULL,
  "execution_description" TEXT NOT NULL,
  "reported_by" UUID NOT NULL,
  "reported_at" TIMESTAMP(6) NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TIMESTAMP(6),

  CONSTRAINT "daily_log_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "daily_log_events_daily_log_id_fkey"
    FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "daily_log_events_event_type_id_fkey"
    FOREIGN KEY ("event_type_id") REFERENCES "event_types"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "daily_log_events_reported_by_fkey"
    FOREIGN KEY ("reported_by") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_daily_log_events_daily_log"
  ON "daily_log_events"("daily_log_id");

CREATE INDEX IF NOT EXISTS "idx_daily_log_events_event_type"
  ON "daily_log_events"("event_type_id");

CREATE INDEX IF NOT EXISTS "idx_daily_log_events_reported_by"
  ON "daily_log_events"("reported_by");

CREATE INDEX IF NOT EXISTS "idx_daily_log_events_reported_at"
  ON "daily_log_events"("reported_at");
