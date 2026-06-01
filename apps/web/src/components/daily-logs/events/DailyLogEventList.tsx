import { DailyLogEvent } from "@/types/daily-log-event";
import { EventType } from "@/types/event-type";
import { DailyLogEventCard } from "./DailyLogEventCard";
import { EmptyEventsState } from "./EmptyEventsState";

type DailyLogEventListProps = {
  dailyLogStatus: string;
  eventTypes?: EventType[];
  events: DailyLogEvent[];
  onAttachmentUpload?: (dailyLogEventId: string, file: File) => Promise<boolean>;
};

export function DailyLogEventList({
  dailyLogStatus,
  eventTypes = [],
  events,
  onAttachmentUpload,
}: DailyLogEventListProps) {
  const sortedEvents = [...events].sort(compareEventsByDate);

  if (!sortedEvents.length) {
    return <EmptyEventsState />;
  }

  return (
    <div className="daily-log-events-timeline" aria-label="Timeline de eventos">
      {sortedEvents.map((event, index) => (
        <div className="daily-log-event-timeline-item" key={event.id ?? index}>
          <span aria-hidden="true" className="daily-log-event-marker" />
          <DailyLogEventCard
            dailyLogStatus={dailyLogStatus}
            event={event}
            eventTypes={eventTypes}
            onAttachmentUpload={onAttachmentUpload}
          />
        </div>
      ))}
    </div>
  );
}

function compareEventsByDate(first: DailyLogEvent, second: DailyLogEvent) {
  return getEventTimestamp(first) - getEventTimestamp(second);
}

function getEventTimestamp(event: DailyLogEvent) {
  const value = event.reportedAt ?? event.createdAt;

  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}
