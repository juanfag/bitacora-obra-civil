CREATE TABLE IF NOT EXISTS "daily_log_status_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "daily_log_id" UUID NOT NULL,
  "from_status" "daily_log_status" NOT NULL,
  "to_status" "daily_log_status" NOT NULL,
  "changed_by" UUID NOT NULL,
  "comments" TEXT,
  "changed_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "daily_log_status_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "daily_log_status_history_daily_log_id_fkey"
    FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "daily_log_status_history_changed_by_fkey"
    FOREIGN KEY ("changed_by") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_daily_log_status_history_log"
  ON "daily_log_status_history"("daily_log_id", "changed_at");

CREATE INDEX IF NOT EXISTS "idx_daily_log_status_history_changed_by"
  ON "daily_log_status_history"("changed_by");
