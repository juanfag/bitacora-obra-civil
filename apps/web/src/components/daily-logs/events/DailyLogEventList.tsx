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
  if (!events.length) {
    return <EmptyEventsState />;
  }

  return (
    <div className="timeline">
      {events.map((event, index) => (
        <div className="timeline-item" key={event.id ?? index}>
          <span aria-hidden="true" className="timeline-marker" />
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
