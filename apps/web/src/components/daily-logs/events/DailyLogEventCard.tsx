import { DailyLogEvent } from "@/types/daily-log-event";
import { EventType } from "@/types/event-type";

type DailyLogEventCardProps = {
  event: DailyLogEvent;
  eventTypes?: EventType[];
  isDeleting?: boolean;
  onDelete?: (eventId: string) => void;
};

export function DailyLogEventCard({
  event,
  eventTypes = [],
  isDeleting = false,
  onDelete,
}: DailyLogEventCardProps) {
  const eventTypeLabel = getEventTypeLabel(event, eventTypes);
  const eventDate = getEventDate(event);
  const eventDescription = getEventDescription(event);
  const eventUser = getEventUser(event);
  const attachmentCount = getAttachmentCount(event);

  return (
    <article className="card timeline-card">
      <div className="status-row">
        {eventTypeLabel ? <span className="badge">{eventTypeLabel}</span> : null}
        {eventDate ? <span className="badge">{formatDateTime(eventDate)}</span> : null}
      </div>

      <h2>{event.activity || event.title || "Evento sin actividad"}</h2>

      {eventDescription ? (
        <p className="muted">{eventDescription}</p>
      ) : (
        <p className="muted">Sin descripción de ejecución.</p>
      )}

      <div className="event-meta">
        {eventUser ? (
          <p className="muted">
            <strong>Usuario:</strong> {eventUser}
          </p>
        ) : null}
        {attachmentCount !== null ? (
          <p className="muted">
            <strong>Adjuntos:</strong> {attachmentCount}
          </p>
        ) : null}
      </div>

      {onDelete && event.id ? (
        <div className="toolbar">
          <button
            className="button secondary"
            disabled={isDeleting}
            onClick={() => onDelete(event.id as string)}
            type="button"
          >
            {isDeleting ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function getEventTypeLabel(event: DailyLogEvent, eventTypes: EventType[]) {
  const eventTypeFromCatalog = eventTypes.find(
    (eventType) => eventType.id === event.eventTypeId,
  );

  return (
    event.eventType?.name ??
    event.eventType?.label ??
    (eventTypeFromCatalog ? getEventTypeOptionLabel(eventTypeFromCatalog) : null) ??
    event.eventTypeName ??
    event.type ??
    event.eventType?.description ??
    event.eventType?.code ??
    (event.eventTypeId ? formatTechnicalId(event.eventTypeId) : null) ??
    null
  );
}

function getEventDescription(event: DailyLogEvent) {
  return event.executionDescription ?? event.executionDetails ?? event.description ?? null;
}

function getEventDate(event: DailyLogEvent) {
  return event.createdAt ?? event.reportedAt ?? null;
}

function getEventUser(event: DailyLogEvent) {
  return (
    event.createdBy?.fullName ??
    event.createdBy?.email ??
    event.reportedBy?.fullName ??
    event.reportedBy?.email ??
    event.user?.fullName ??
    event.user?.email ??
    null
  );
}

function getAttachmentCount(event: DailyLogEvent) {
  if (typeof event.attachmentCount === "number") {
    return event.attachmentCount;
  }

  if (typeof event.attachmentsCount === "number") {
    return event.attachmentsCount;
  }

  if (Array.isArray(event.attachments)) {
    return event.attachments.length;
  }

  return null;
}

function getEventTypeOptionLabel(eventType: EventType) {
  if (eventType.code && eventType.name) {
    return `${eventType.code} - ${eventType.name}`;
  }

  return eventType.name ?? eventType.code ?? eventType.description ?? formatTechnicalId(eventType.id);
}

function formatTechnicalId(value: string) {
  if (value.length <= 13) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
