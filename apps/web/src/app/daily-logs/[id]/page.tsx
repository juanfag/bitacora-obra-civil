"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { CreateDailyLogEventForm } from "@/components/daily-logs/events/CreateDailyLogEventForm";
import { DailyLogEventList } from "@/components/daily-logs/events/DailyLogEventList";
import { InfoCard } from "@/components/ui/InfoCard";
import { StatusBadge } from "@/components/workflow/StatusBadge";
import {
  WorkflowAction,
  WorkflowActions,
} from "@/components/workflow/WorkflowActions";
import {
  ApiClientError,
  apiRequest,
  getDailyLogEventAttachments,
  getEventTypes,
  uploadDailyLogEventAttachment,
} from "@/lib/api-client";
import { logout } from "@/lib/auth";
import {
  canCreateDailyLogEvent,
  isDailyLogReadOnly,
} from "@/lib/daily-log-workflow";
import { DailyLog } from "@/types/daily-log";
import {
  CreateDailyLogEventInput,
  DailyLogEvent,
} from "@/types/daily-log-event";
import { EventType } from "@/types/event-type";

export default function DailyLogDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [dailyLogEvents, setDailyLogEvents] = useState<DailyLogEvent[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [eventTypesError, setEventTypesError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  const handleUnauthorized = useCallback(() => {
    logout();
    router.replace("/login");
  }, [router]);

  const loadDailyLog = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setEventTypesError(null);
    setNotFound(false);

    try {
      const [response, eventsResponse] = await Promise.all([
        apiRequest<DailyLog>(`/daily-logs/${encodeURIComponent(params.id)}`),
        apiRequest<CollectionResponse<DailyLogEvent>>(
          `/daily-log-events?dailyLogId=${encodeURIComponent(params.id)}`,
        ),
      ]);

      const loadedEvents = toCollection(eventsResponse);
      const sourceEvents =
        loadedEvents.length > 0 ? loadedEvents : getEventsFromDailyLog(response);
      const eventsWithAttachments = await getEventsWithAttachments(sourceEvents);

      setDailyLog(response);
      setDailyLogEvents(eventsWithAttachments);

      try {
        const eventTypesResponse = await getEventTypes();
        setEventTypes(getActiveEventTypes(eventTypesResponse));
      } catch (caughtError) {
        setEventTypes([]);

        if (caughtError instanceof ApiClientError && caughtError.status === 401) {
          handleUnauthorized();
          return;
        }

        setEventTypesError(
          "No fue posible cargar los tipos de evento. Puedes ingresar el ID manualmente temporalmente.",
        );
      }
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError) {
        if (caughtError.status === 401) {
          handleUnauthorized();
          return;
        }

        if (caughtError.status === 404) {
          setNotFound(true);
          setDailyLog(null);
          setDailyLogEvents([]);
          return;
        }

        setError(caughtError.message);
        return;
      }

      setError("No fue posible cargar la bitácora.");
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized, params.id]);

  useEffect(() => {
    let isMounted = true;

    loadDailyLog().catch(() => {
      if (isMounted) {
        setError("No fue posible cargar la bitácora.");
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [loadDailyLog]);

  async function runWorkflowAction(action: WorkflowAction) {
    setProcessingAction(action);
    setError(null);
    setSuccessMessage(null);

    const body =
      action === "reject"
        ? {
            comment:
              window.prompt("Motivo del rechazo de esta bitácora") ||
              "Rechazado desde el frontend.",
          }
        : undefined;

    try {
      await apiRequest<DailyLog>(
        `/daily-logs/${encodeURIComponent(params.id)}/${action}`,
        {
          method: "POST",
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
      );

      await loadDailyLog();
      setSuccessMessage("Operación realizada correctamente.");
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError) {
        if (caughtError.status === 401) {
          handleUnauthorized();
          return;
        }

        setError(caughtError.message);
        return;
      }

      setError("No fue posible completar la acción.");
    } finally {
      setProcessingAction(null);
    }
  }

  async function createEvent(values: CreateDailyLogEventInput) {
    setError(null);
    setSuccessMessage(null);
    setIsCreatingEvent(true);

    try {
      await apiRequest<DailyLogEvent>("/daily-log-events", {
        method: "POST",
        body: JSON.stringify({
          dailyLogId: params.id,
          eventTypeId: values.eventTypeId,
          activity: values.activity,
          executionDescription: values.executionDescription,
          reportedAt: new Date().toISOString(),
        }),
      });

      await loadDailyLog();
      setSuccessMessage("Evento creado correctamente.");
      return true;
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError) {
        if (caughtError.status === 401) {
          handleUnauthorized();
          return false;
        }

        setError(caughtError.message || "No fue posible crear el evento.");
        return false;
      }

      setError("No fue posible crear el evento.");
      return false;
    } finally {
      setIsCreatingEvent(false);
    }
  }

  async function uploadAttachment(dailyLogEventId: string, file: File) {
    setError(null);
    setSuccessMessage(null);

    try {
      await uploadDailyLogEventAttachment(dailyLogEventId, file);
      await loadDailyLog();
      setSuccessMessage("Adjunto cargado correctamente.");
      return true;
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError) {
        if (caughtError.status === 401) {
          handleUnauthorized();
          return false;
        }

        setError(caughtError.message || "No fue posible cargar el adjunto.");
        return false;
      }

      setError("No fue posible cargar el adjunto.");
      return false;
    }
  }

  return (
    <AuthGuard>
      <section>
        <div className="page-header">
          <div>
            <p className="eyebrow">Detalle de bitácora</p>
            <h1>
              {dailyLog
                ? `Bitácora del ${formatDate(dailyLog.logDate)}`
                : "Bitácora diaria"}
            </h1>
            <p className="muted">
              Revisa el estado actual de la bitácora y su información guardada.
            </p>
          </div>
          {dailyLog?.projectId ? (
            <Link
              className="button secondary"
              href={`/daily-logs?projectId=${dailyLog.projectId}`}
            >
              Volver
            </Link>
          ) : (
            <Link className="button secondary" href="/projects">
              Volver
            </Link>
          )}
        </div>

        {isLoading ? (
          <InfoCard>
            <p className="muted">Cargando...</p>
          </InfoCard>
        ) : null}

        {notFound ? (
          <InfoCard title="Bitácora no encontrada">
            <p className="muted">
              La bitácora solicitada no existe o ya no está disponible.
            </p>
            <Link className="button" href="/projects">
              Volver a proyectos
            </Link>
          </InfoCard>
        ) : null}

        {error ? (
          <InfoCard>
            <p className="form-error">{error}</p>
          </InfoCard>
        ) : null}

        {successMessage ? (
          <InfoCard>
            <p className="form-success">{successMessage}</p>
          </InfoCard>
        ) : null}

        {!isLoading && !notFound && dailyLog ? (
          <div className="grid">
            <InfoCard title="Resumen">
              <div className="status-row">
                <StatusBadge status={dailyLog.status} />
                <span className="badge">{formatDate(dailyLog.logDate)}</span>
              </div>
              <p className="muted">
                {dailyLog.comments ||
                  "No hay comentarios registrados para esta bitácora."}
              </p>
            </InfoCard>

            <InfoCard title="Acciones del flujo">
              <WorkflowActions
                dailyLogStatus={dailyLog.status}
                onRunAction={runWorkflowAction}
                processingAction={processingAction}
              />
              {processingAction ? <p className="muted">Cargando...</p> : null}
            </InfoCard>

            <InfoCard className="events-panel" title="Eventos de la bitácora">
              {isDailyLogReadOnly(dailyLog.status) ? (
                <p className="muted readonly-note">
                  Esta bitácora está en modo solo lectura. No se pueden agregar eventos ni adjuntos.
                </p>
              ) : null}

              {canCreateDailyLogEvent(dailyLog.status) ? (
                <CreateDailyLogEventForm
                  catalogError={eventTypesError}
                  dailyLogStatus={dailyLog.status}
                  eventTypes={eventTypes}
                  isSubmitting={isCreatingEvent}
                  onSubmit={createEvent}
                />
              ) : null}

              <DailyLogEventList
                dailyLogStatus={dailyLog.status}
                events={dailyLogEvents}
                eventTypes={eventTypes}
                onAttachmentUpload={uploadAttachment}
              />
            </InfoCard>

            <InfoCard title="Metadatos">
              <p>
                <strong>ID del proyecto:</strong>{" "}
                {formatTechnicalId(dailyLog.projectId)}
              </p>
              <p>
                <strong>Creado:</strong>{" "}
                {dailyLog.createdAt
                  ? formatDateTime(dailyLog.createdAt)
                  : "No disponible"}
              </p>
              <p>
                <strong>Actualizado:</strong>{" "}
                {dailyLog.updatedAt
                  ? formatDateTime(dailyLog.updatedAt)
                  : "No disponible"}
              </p>
            </InfoCard>
          </div>
        ) : null}
      </section>
    </AuthGuard>
  );
}

type CollectionResponse<T> =
  | T[]
  | {
      data?: T[];
      items?: T[];
      results?: T[];
    };

function toCollection<T>(response: CollectionResponse<T>) {
  if (Array.isArray(response)) {
    return response;
  }

  return response.data ?? response.items ?? response.results ?? [];
}

function getEventsFromDailyLog(dailyLog: DailyLog) {
  return dailyLog.events ?? dailyLog.dailyLogEvents ?? dailyLog.DailyLogEvents ?? [];
}

async function getEventsWithAttachments(events: DailyLogEvent[]) {
  return Promise.all(
    events.map(async (event) => {
      if (!event.id) {
        return {
          ...event,
          attachments: event.attachments ?? [],
        };
      }

      try {
        const attachments = await getDailyLogEventAttachments(event.id);
        return {
          ...event,
          attachments,
        };
      } catch (caughtError) {
        if (caughtError instanceof ApiClientError && caughtError.status === 401) {
          throw caughtError;
        }

        return {
          ...event,
          attachments: event.attachments ?? [],
        };
      }
    }),
  );
}

function getActiveEventTypes(eventTypes: EventType[]) {
  return eventTypes.filter((eventType) => {
    if (typeof eventType.isActive === "boolean") {
      return eventType.isActive;
    }

    return !eventType.status || eventType.status === "ACTIVE";
  });
}

function formatTechnicalId(value: string) {
  if (value.length <= 13) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
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
