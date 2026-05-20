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

type DailyLogEvent = {
  id?: string;
  eventType?: {
    name?: string | null;
    code?: string | null;
  } | null;
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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [eventTypeValue, setEventTypeValue] = useState("");
  const [eventActivity, setEventActivity] = useState("");
  const [eventExecutionDescription, setEventExecutionDescription] = useState("");
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

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

      setDailyLog(response);
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
      await loadDailyLog();
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

  return (
    <AuthGuard>
      <section>
        <div className="page-header">
          <div>
            <p className="eyebrow">Detalle de bitácora</p>
            <h1>
              {dailyLog
                ? `Bitácora ${formatDate(dailyLog.logDate)}`
                : `Bitácora ${params.id}`}
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
              <DailyLogEvents events={getDailyLogEvents(dailyLog)} />
              {canCreateEvents(dailyLog.status) ? (
                <form className="form event-form" onSubmit={createEvent}>
                  <h2>Crear evento</h2>
                  <div className="field">
                    <label htmlFor="eventType">Tipo de evento</label>
                    <input
                      id="eventType"
                      name="eventType"
                      onChange={(event) => setEventTypeValue(event.target.value)}
                      placeholder="ID del tipo de evento"
                      required
                      type="text"
                      value={eventTypeValue}
                    />
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
                  <button disabled={isCreatingEvent} type="submit">
                    {isCreatingEvent ? "Guardando..." : "Crear evento"}
                  </button>
                </form>
              ) : null}
            </article>

            <article className="panel">
              <h2>Metadatos</h2>
              <p>
                <strong>ID del proyecto:</strong> {dailyLog.projectId}
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

function DailyLogEvents({ events }: { events: DailyLogEvent[] }) {
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
            {getEventTypeLabel(event) ? (
              <span className="badge">{getEventTypeLabel(event)}</span>
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

function getDailyLogEvents(dailyLog: DailyLog) {
  return (
    dailyLog.dailyLogEvents ??
    dailyLog.events ??
    dailyLog.DailyLogEvents ??
    []
  );
}

function getEventTypeLabel(event: DailyLogEvent) {
  return event.eventType?.name ?? event.eventTypeName ?? event.type ?? event.eventType?.code ?? null;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
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
