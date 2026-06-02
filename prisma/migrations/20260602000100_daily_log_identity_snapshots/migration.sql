ALTER TABLE "daily_logs"
  ADD COLUMN "responsible_name_snapshot" VARCHAR(200),
  ADD COLUMN "approved_by_name_snapshot" VARCHAR(200);

ALTER TABLE "audit_logs"
  ADD COLUMN "actor_name_snapshot" VARCHAR(200),
  ADD COLUMN "actor_email_snapshot" VARCHAR(150);
