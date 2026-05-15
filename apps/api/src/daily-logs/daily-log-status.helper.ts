import { DailyLogStatus } from "@prisma/client";

const EDITABLE_DAILY_LOG_STATUSES = [
  DailyLogStatus.DRAFT,
] as const;

// TODO: Revisit this helper when the official workflow states are migrated
// to OPEN/PENDING_APPROVAL/REOPENED/CANCELLED.
export const isEditableStatus = (status: DailyLogStatus) =>
  EDITABLE_DAILY_LOG_STATUSES.includes(
    status as (typeof EDITABLE_DAILY_LOG_STATUSES)[number],
  );
