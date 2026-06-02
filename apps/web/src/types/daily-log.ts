import { DailyLogEvent } from "./daily-log-event";

export type DailyLog = {
  id: string;
  projectId: string;
  project?: {
    id?: string;
    code?: string | null;
    name?: string | null;
  } | null;
  projectCode?: string | null;
  projectName?: string | null;
  logDate: string;
  status: string;
  comments?: string | null;
  responsibleNameSnapshot?: string | null;
  approvedByNameSnapshot?: string | null;
  createdBy?: UserSummary | null;
  responsible?: UserSummary | null;
  reviewedBy?: UserSummary | null;
  approvedBy?: UserSummary | null;
  updatedBy?: UserSummary | null;
  user?: UserSummary | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  events?: DailyLogEvent[];
  dailyLogEvents?: DailyLogEvent[];
  DailyLogEvents?: DailyLogEvent[];
};

export type UserSummary = {
  email?: string | null;
  fullName?: string | null;
  name?: string | null;
};
