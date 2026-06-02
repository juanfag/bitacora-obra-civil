import { DailyLogEvent } from "@/types/daily-log-event";
import { EventType } from "@/types/event-type";
import { canUploadEventAttachment } from "@/lib/daily-log-workflow";
import { EventAttachmentList } from "./EventAttachmentList";
import { EventAttachmentUpload } from "./EventAttachmentUpload";

type DailyLogEventCardProps = {
  canUploadAttachments?: boolean;
  dailyLogStatus: string;
  event: DailyLogEvent;
  eventTypes?: EventType[];
  onAttachmentUpload?: (dailyLogEventId: string, file: File) => Promise<boolean>;
};

export function DailyLogEventCard({
  canUploadAttachments = true,
  dailyLogStatus,
  event,
  eventTypes = [],
  onAttachmentUpload,
}: DailyLogEventCardProps) {
  const eventTypeLabel = getEventTypeLabel(event, eventTypes);
  const eventDate = getEventDate(event);
  const eventDescription = getEventDescription(event);
  const eventUser = getEventUser(event);
  const attachmentCount = getAttachmentCount(event);
  const hasAttachments = Boolean(attachmentCount && attachmentCount > 0);

  return (
    <article className="daily-log-event-card">
      <div className="daily-log-event-card-header">
        <div className="daily-log-event-heading">
          {eventTypeLabel ? (
            <span className="daily-log-event-type-badge">{eventTypeLabel}</span>
          ) : null}
          <h3>{event.activity || event.title || "Evento sin actividad"}</h3>
        </div>

        <div className="daily-log-event-meta-line">
          {eventDate ? <span>{formatEventTime(eventDate)}</span> : null}
          {eventUser ? <span>Reportado por {eventUser}</span> : null}
        </div>
      </div>

      <div className="daily-log-event-body">
        {eventDescription ? (
          <p>{eventDescription}</p>
        ) : (
          <p className="muted">Sin descripción de ejecución.</p>
        )}
      </div>

      <div className="daily-log-event-evidence-row">
        <span
          className={
            hasAttachments
              ? "daily-log-evidence-chip"
              : "daily-log-evidence-chip daily-log-evidence-chip-muted"
          }
        >
          {formatAttachmentSummary(attachmentCount)}
        </span>
        {eventDate ? (
          <span className="daily-log-event-date">
            {formatEventDate(eventDate)}
          </span>
        ) : null}
      </div>

      <footer className="daily-log-event-footer">
        <EventAttachmentList attachments={event.attachments} />

        {canUploadAttachments &&
        canUploadEventAttachment(dailyLogStatus) &&
        event.id &&
        onAttachmentUpload ? (
          <EventAttachmentUpload
            dailyLogEventId={event.id}
            dailyLogStatus={dailyLogStatus}
            onUpload={onAttachmentUpload}
          />
        ) : null}
      </footer>
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
  return event.reportedAt ?? event.createdAt ?? null;
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

function formatEventTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Hora no disponible";
  }

  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(date);
}

function formatEventDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Bogota",
  }).format(date);
}

function formatAttachmentSummary(value: number | null) {
  if (!value) {
    return "Sin evidencia";
  }

  return value === 1 ? "1 adjunto" : `${value} adjuntos`;
}
