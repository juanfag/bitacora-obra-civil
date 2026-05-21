import { DailyLogEvent } from "./daily-log-event";

export type DailyLog = {
  id: string;
  projectId: string;
  logDate: string;
  status: string;
  comments?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  events?: DailyLogEvent[];
  dailyLogEvents?: DailyLogEvent[];
  DailyLogEvents?: DailyLogEvent[];
};
