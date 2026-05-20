"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { ApiClientError, apiRequest } from "@/lib/api-client";
import { logout } from "@/lib/auth";

type DailyLog = {
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

type EventType = {
  id: string;
  name?: string | null;
  label?: string | null;
  description?: string | null;
  code?: string | null;
};

type DailyLogEvent = {
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
};

type UserSummary = {
  fullName?: string | null;
  email?: string | null;
};

type WorkflowAction = "submit" | "approve" | "reject" | "close" | "return-to-draft";

const workflowActionsByStatus: Record<string, WorkflowAction[]> = {
  DRAFT: ["submit"],
  IN_REVIEW: ["approve", "reject"],
  APPROVED: ["close"],
  REJECTED: ["return-to-draft"],
  CLOSED: [],
  VOIDED: [],
};

const workflowActionLabels: Record<WorkflowAction, string> = {
  submit: "Enviar a revisión",
  approve: "Aprobar",
  reject: "Rechazar",
  close: "Cerrar bitácora",
  "return-to-draft": "Devolver a borrador",
};

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
  const [eventTypeValue, setEventTypeValue] = useState("");
  const [eventActivity, setEventActivity] = useState("");
  const [eventExecutionDescription, setEventExecutionDescription] = useState("");
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState("");
  const [editingExecutionDescription, setEditingExecutionDescription] =
    useState("");
  const [savingEventId, setSavingEventId] = useState<string | null>(null);

  const handleUnauthorized = useCallback(() => {
    logout();
    router.replace("/login");
  }, [router]);

  const loadDailyLogEvents = useCallback(async () => {
    const response = await apiRequest<CollectionResponse<DailyLogEvent>>(
      `/daily-log-events?dailyLogId=${encodeURIComponent(params.id)}`,
    );

    setDailyLogEvents(toCollection(response));
  }, [params.id]);

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

      setDailyLog(response);
      setEventTypes(toCollection(eventTypesResponse));
      setDailyLogEvents(toCollection(eventsResponse));
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError) {
        if (caughtError.status === 401) {
          handleUnauthorized();
          return;
        }

        if (caughtError.status === 404) {
          setNotFound(true);
          setDailyLog(null);
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

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsCreatingEvent(true);

    try {
      await apiRequest<DailyLogEvent>("/daily-log-events", {
        method: "POST",
        body: JSON.stringify({
          dailyLogId: params.id,
          eventTypeId: eventTypeValue,
          activity: eventActivity,
          executionDescription: eventExecutionDescription,
          reportedAt: new Date().toISOString(),
        }),
      });

      setEventTypeValue("");
      setEventActivity("");
      setEventExecutionDescription("");
      await loadDailyLogEvents();
      setSuccessMessage("Evento creado correctamente.");
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError) {
        if (caughtError.status === 401) {
          handleUnauthorized();
          return;
        }

        setError(caughtError.message || "Error al crear el evento.");
        return;
      }

      setError("Error al crear el evento.");
    } finally {
      setIsCreatingEvent(false);
    }
  }

  function startEditingEvent(event: DailyLogEvent) {
    if (!event.id) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setEditingEventId(event.id);
    setEditingActivity(event.activity ?? event.title ?? "");
    setEditingExecutionDescription(getEventDescription(event) ?? "");
  }

  function cancelEditingEvent() {
    setEditingEventId(null);
    setEditingActivity("");
    setEditingExecutionDescription("");
  }

  async function updateEvent(eventId: string) {
    setError(null);
    setSuccessMessage(null);
    setSavingEventId(eventId);

    try {
      await apiRequest<DailyLogEvent>(
        `/daily-log-events/${encodeURIComponent(eventId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            activity: editingActivity,
            executionDescription: editingExecutionDescription,
          }),
        },
      );

      await loadDailyLogEvents();
      cancelEditingEvent();
      setSuccessMessage("Evento actualizado correctamente.");
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError) {
        if (caughtError.status === 401) {
          handleUnauthorized();
          return;
        }

        setError(caughtError.message || "Error al actualizar el evento.");
        return;
      }

      setError("Error al actualizar el evento.");
    } finally {
      setSavingEventId(null);
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
          <div className="panel">
            <p className="muted">Cargando...</p>
          </div>
        ) : null}

        {notFound ? (
          <div className="panel">
            <h2>Bitácora no encontrada</h2>
            <p className="muted">
              La bitácora solicitada no existe o ya no está disponible.
            </p>
            <Link className="button" href="/projects">
              Volver a proyectos
            </Link>
          </div>
        ) : null}

        {error ? (
          <div className="panel">
            <p className="form-error">{error}</p>
          </div>
        ) : null}

        {successMessage ? (
          <div className="panel">
            <p className="form-success">{successMessage}</p>
          </div>
        ) : null}

        {!isLoading && !notFound && dailyLog ? (
          <div className="grid">
            <article className="panel">
              <h2>Resumen</h2>
              <div className="status-row">
                <span className="badge">{dailyLog.status}</span>
                <span className="badge">{formatDate(dailyLog.logDate)}</span>
              </div>
              <p className="muted">
                {dailyLog.comments || "No hay comentarios registrados para esta bitácora."}
              </p>
            </article>

            <article className="panel">
              <h2>Acciones del flujo</h2>
              <WorkflowActions
                dailyLogStatus={dailyLog.status}
                onRunAction={runWorkflowAction}
                processingAction={processingAction}
              />
              {processingAction ? (
                <p className="muted">Cargando...</p>
              ) : null}
            </article>

            <article className="panel">
              <h2>Eventos de la bitácora</h2>
              <EditableDailyLogEvents
                canEdit={canCreateEvents(dailyLog.status)}
                editingActivity={editingActivity}
                editingEventId={editingEventId}
                editingExecutionDescription={editingExecutionDescription}
                eventTypes={eventTypes}
                events={dailyLogEvents}
                onCancelEditing={cancelEditingEvent}
                onEditingActivityChange={setEditingActivity}
                onEditingExecutionDescriptionChange={
                  setEditingExecutionDescription
                }
                onSaveEvent={updateEvent}
                onStartEditing={startEditingEvent}
                savingEventId={savingEventId}
              />
              {canCreateEvents(dailyLog.status) ? (
                <form className="form event-form" onSubmit={createEvent}>
                  <h2>Crear evento</h2>
                  <div className="field">
                    <label htmlFor="eventType">Tipo de evento</label>
                    {eventTypes.length === 0 ? (
                      <p className="muted">No hay tipos de evento disponibles.</p>
                    ) : null}
                    <select
                      id="eventType"
                      name="eventType"
                      onChange={(event) => setEventTypeValue(event.target.value)}
                      required
                      value={eventTypeValue}
                    >
                      <option value="">Selecciona un tipo de evento</option>
                      {eventTypes.map((eventType) => (
                        <option key={eventType.id} value={eventType.id}>
                          {getEventTypeOptionLabel(eventType)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="activity">Actividad</label>
                    <input
                      id="activity"
                      name="activity"
                      onChange={(event) => setEventActivity(event.target.value)}
                      required
                      type="text"
                      value={eventActivity}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="executionDescription">
                      Descripción de ejecución
                    </label>
                    <textarea
                      id="executionDescription"
                      name="executionDescription"
                      onChange={(event) =>
                        setEventExecutionDescription(event.target.value)
                      }
                      required
                      rows={4}
                      value={eventExecutionDescription}
                    />
                  </div>
                  <button
                    disabled={isCreatingEvent || eventTypes.length === 0}
                    type="submit"
                  >
                    {isCreatingEvent ? "Guardando..." : "Crear evento"}
                  </button>
                </form>
              ) : null}
            </article>

            <article className="panel">
              <h2>Metadatos</h2>
              <p>
                <strong>ID del proyecto:</strong>{" "}
                {formatTechnicalId(dailyLog.projectId)}
              </p>
              <p>
                <strong>Creado:</strong>{" "}
                {dailyLog.createdAt ? formatDateTime(dailyLog.createdAt) : "No disponible"}
              </p>
              <p>
                <strong>Actualizado:</strong>{" "}
                {dailyLog.updatedAt ? formatDateTime(dailyLog.updatedAt) : "No disponible"}
              </p>
            </article>
          </div>
        ) : null}
      </section>
    </AuthGuard>
  );
}

function WorkflowActions({
  dailyLogStatus,
  onRunAction,
  processingAction,
}: {
  dailyLogStatus: string;
  onRunAction: (action: WorkflowAction) => void;
  processingAction: string | null;
}) {
  const availableActions = workflowActionsByStatus[dailyLogStatus] ?? [];

  if (availableActions.length === 0) {
    return (
      <p className="muted">No hay acciones disponibles para este estado.</p>
    );
  }

  return (
    <div className="toolbar">
      {availableActions.map((action) => (
        <button
          className={action === "return-to-draft" ? "button secondary" : undefined}
          disabled={Boolean(processingAction)}
          key={action}
          onClick={() => onRunAction(action)}
          type="button"
        >
          {workflowActionLabels[action]}
        </button>
      ))}
    </div>
  );
}

function EditableDailyLogEvents({
  canEdit,
  editingActivity,
  editingEventId,
  editingExecutionDescription,
  events,
  eventTypes,
  onCancelEditing,
  onEditingActivityChange,
  onEditingExecutionDescriptionChange,
  onSaveEvent,
  onStartEditing,
  savingEventId,
}: {
  canEdit: boolean;
  editingActivity: string;
  editingEventId: string | null;
  editingExecutionDescription: string;
  events: DailyLogEvent[];
  eventTypes: EventType[];
  onCancelEditing: () => void;
  onEditingActivityChange: (value: string) => void;
  onEditingExecutionDescriptionChange: (value: string) => void;
  onSaveEvent: (eventId: string) => void;
  onStartEditing: (event: DailyLogEvent) => void;
  savingEventId: string | null;
}) {
  if (!events.length) {
    return (
      <p className="muted">Esta bitÃ¡cora aÃºn no tiene eventos registrados.</p>
    );
  }

  return (
    <div className="grid">
      {events.map((event, index) => {
        const eventId = event.id ?? null;
        const isEditing = Boolean(eventId && editingEventId === eventId);
        const isSaving = Boolean(eventId && savingEventId === eventId);

        return (
          <article className="card" key={event.id ?? index}>
            <div className="status-row">
              {getEventTypeLabel(event, eventTypes) ? (
                <span className="badge">{getEventTypeLabel(event, eventTypes)}</span>
              ) : null}
              {getEventDate(event) ? (
                <span className="badge">{formatDateTime(getEventDate(event) as string)}</span>
              ) : null}
            </div>

            {isEditing ? (
              <div className="form">
                <div className="field">
                  <label htmlFor={`event-activity-${eventId}`}>
                    Actividad del evento
                  </label>
                  <input
                    id={`event-activity-${eventId}`}
                    onChange={(changeEvent) =>
                      onEditingActivityChange(changeEvent.target.value)
                    }
                    type="text"
                    value={editingActivity}
                  />
                </div>
                <div className="field">
                  <label htmlFor={`event-description-${eventId}`}>
                    Descripción de ejecución del evento
                  </label>
                  <textarea
                    id={`event-description-${eventId}`}
                    onChange={(changeEvent) =>
                      onEditingExecutionDescriptionChange(
                        changeEvent.target.value,
                      )
                    }
                    rows={4}
                    value={editingExecutionDescription}
                  />
                </div>
                <div className="toolbar">
                  <button
                    disabled={isSaving}
                    onClick={() => (eventId ? onSaveEvent(eventId) : undefined)}
                    type="button"
                  >
                    {isSaving ? "Guardando..." : "Guardar cambios"}
                  </button>
                  <button
                    className="button secondary"
                    disabled={isSaving}
                    onClick={onCancelEditing}
                    type="button"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2>{event.activity || event.title || "Evento sin actividad"}</h2>
                <p className="muted">
                  {getEventDescription(event) || "Sin descripciÃ³n de ejecuciÃ³n."}
                </p>
                {getEventUser(event) ? (
                  <p className="muted">
                    <strong>Usuario:</strong> {getEventUser(event)}
                  </p>
                ) : null}
                {canEdit && eventId ? (
                  <button
                    className="button secondary"
                    onClick={() => onStartEditing(event)}
                    type="button"
                  >
                    Editar
                  </button>
                ) : null}
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}

function DailyLogEvents({
  canEdit,
  editingActivity,
  editingEventId,
  editingExecutionDescription,
  events,
  eventTypes,
  onCancelEditing,
  onEditingActivityChange,
  onEditingExecutionDescriptionChange,
  onSaveEvent,
  onStartEditing,
  savingEventId,
}: {
  canEdit: boolean;
  editingActivity: string;
  editingEventId: string | null;
  editingExecutionDescription: string;
  events: DailyLogEvent[];
  eventTypes: EventType[];
  onCancelEditing: () => void;
  onEditingActivityChange: (value: string) => void;
  onEditingExecutionDescriptionChange: (value: string) => void;
  onSaveEvent: (eventId: string) => void;
  onStartEditing: (event: DailyLogEvent) => void;
  savingEventId: string | null;
}) {
  if (!events.length) {
    return (
      <p className="muted">Esta bitácora aún no tiene eventos registrados.</p>
    );
  }

  return (
    <div className="grid">
      {events.map((event, index) => (
        <article className="card" key={event.id ?? index}>
          <div className="status-row">
            {getEventTypeLabel(event, eventTypes) ? (
              <span className="badge">{getEventTypeLabel(event, eventTypes)}</span>
            ) : null}
            {getEventDate(event) ? (
              <span className="badge">{formatDateTime(getEventDate(event) as string)}</span>
            ) : null}
          </div>
          <h2>{event.activity || event.title || "Evento sin actividad"}</h2>
          <p className="muted">
            {getEventDescription(event) || "Sin descripción de ejecución."}
          </p>
          {getEventUser(event) ? (
            <p className="muted">
              <strong>Usuario:</strong> {getEventUser(event)}
            </p>
          ) : null}
        </article>
      ))}
    </div>
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

function canCreateEvents(status: string) {
  return status !== "CLOSED" && status !== "VOIDED";
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

function getEventTypeOptionLabel(eventType: EventType) {
  return (
    eventType.name ??
    eventType.label ??
    eventType.description ??
    eventType.code ??
    formatTechnicalId(eventType.id)
  );
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
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
