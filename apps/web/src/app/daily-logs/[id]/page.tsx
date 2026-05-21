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
import { ApiClientError, apiRequest } from "@/lib/api-client";
import { logout } from "@/lib/auth";
import { DailyLog } from "@/types/daily-log";
import {
  CreateDailyLogEventInput,
  DailyLogEvent,
  EventType,
} from "@/types/daily-log-event";

export default function DailyLogDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [dailyLog, setDailyLog] = useState<DailyLog | null>(null);
  const [dailyLogEvents, setDailyLogEvents] = useState<DailyLogEvent[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  const handleUnauthorized = useCallback(() => {
    logout();
    router.replace("/login");
  }, [router]);

  const loadDailyLog = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const response = await apiRequest<DailyLog>(
        `/daily-logs/${encodeURIComponent(params.id)}`,
      );
      const [eventTypesResponse, eventsResponse] = await Promise.all([
        apiRequest<CollectionResponse<EventType>>("/event-types"),
        apiRequest<CollectionResponse<DailyLogEvent>>(
          `/daily-log-events?dailyLogId=${encodeURIComponent(params.id)}`,
        ),
      ]);

      const loadedEvents = toCollection(eventsResponse);

      setDailyLog(response);
      setEventTypes(toCollection(eventTypesResponse));
      setDailyLogEvents(
        loadedEvents.length > 0 ? loadedEvents : getEventsFromDailyLog(response),
      );
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

  async function deleteEvent(eventId: string) {
    const shouldDelete = window.confirm(
      "¿Seguro que deseas eliminar este evento?",
    );

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setDeletingEventId(eventId);

    const previousEvents = dailyLogEvents;
    setDailyLogEvents((currentEvents) =>
      currentEvents.filter((event) => event.id !== eventId),
    );

    try {
      await apiRequest<void>(
        `/daily-log-events/${encodeURIComponent(eventId)}`,
        {
          method: "DELETE",
        },
      );

      setSuccessMessage("Evento eliminado correctamente.");
    } catch (caughtError) {
      setDailyLogEvents(previousEvents);

      if (caughtError instanceof ApiClientError) {
        if (caughtError.status === 401) {
          handleUnauthorized();
          return;
        }

        if (caughtError.status === 403 || caughtError.status === 409) {
          setError("El evento no puede eliminarse en el estado actual de la bitácora.");
          return;
        }

        setError("No fue posible eliminar el evento.");
        return;
      }

      setError("No fue posible eliminar el evento.");
    } finally {
      setDeletingEventId(null);
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
              {isDailyLogEventCreateable(dailyLog.status) ? (
                <CreateDailyLogEventForm
                  eventTypes={eventTypes}
                  isSubmitting={isCreatingEvent}
                  onSubmit={createEvent}
                />
              ) : null}
              <DailyLogEventList
                canDelete={canDeleteDailyLogEvents(dailyLog.status)}
                deletingEventId={deletingEventId}
                events={dailyLogEvents}
                eventTypes={eventTypes}
                onDeleteEvent={deleteEvent}
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

function isDailyLogEventCreateable(status: string) {
  return status === "DRAFT" || status === "REJECTED";
}

function canDeleteDailyLogEvents(status: string) {
  return status === "DRAFT";
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
