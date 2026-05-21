import { DailyLogEvent } from "@/types/daily-log-event";
import { EventType } from "@/types/event-type";
import { DailyLogEventCard } from "./DailyLogEventCard";
import { EmptyEventsState } from "./EmptyEventsState";

type DailyLogEventListProps = {
  canDelete?: boolean;
  deletingEventId?: string | null;
  eventTypes?: EventType[];
  events: DailyLogEvent[];
  onDeleteEvent?: (eventId: string) => void;
};

export function DailyLogEventList({
  canDelete = false,
  deletingEventId = null,
  eventTypes = [],
  events,
  onDeleteEvent,
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
            event={event}
            eventTypes={eventTypes}
            isDeleting={Boolean(event.id && deletingEventId === event.id)}
            onDelete={canDelete ? onDeleteEvent : undefined}
          />
        </div>
      ))}
    </div>
  );
}
