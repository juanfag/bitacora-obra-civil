export type UserSummary = {
  fullName?: string | null;
  email?: string | null;
};

export type DailyLogEvent = {
  id?: string;
  eventType?: {
    name?: string | null;
    label?: string | null;
    description?: string | null;
    code?: string | null;
  } | null;
  eventTypeId?: string | null;
  type?: string | null;
  eventTypeName?: string | null;
  activity?: string | null;
  title?: string | null;
  executionDescription?: string | null;
  executionDetails?: string | null;
  description?: string | null;
  createdAt?: string | null;
  reportedAt?: string | null;
  createdBy?: UserSummary | null;
  reportedBy?: UserSummary | null;
  user?: UserSummary | null;
  attachments?: unknown[] | null;
  attachmentCount?: number | null;
  attachmentsCount?: number | null;
};

export type CreateDailyLogEventInput = {
  eventTypeId: string;
  activity: string;
  executionDescription: string;
};
