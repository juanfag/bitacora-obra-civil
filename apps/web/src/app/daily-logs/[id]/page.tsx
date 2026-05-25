"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
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
  downloadDailyLogPdf,
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
  const [documentEvidence, setDocumentEvidence] =
    useState<DocumentEvidence | null>(null);
  const [documentEvidenceError, setDocumentEvidenceError] =
    useState<string | null>(null);
  const [isLoadingDocumentEvidence, setIsLoadingDocumentEvidence] =
    useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [preliminarySignatures, setPreliminarySignatures] =
    useState<Record<string, PreliminarySignature | null>>({});

  const handleUnauthorized = useCallback(() => {
    logout();
    router.replace("/login");
  }, [router]);

  const loadDailyLog = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setEventTypesError(null);
    setDocumentEvidenceError(null);
    setDocumentEvidence(null);
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
      setIsLoadingDocumentEvidence(true);

      try {
        const evidenceResponse = await apiRequest<DocumentEvidence>(
          `/daily-logs/${encodeURIComponent(params.id)}/document-evidence`,
        );
        setDocumentEvidence(evidenceResponse);
      } catch (caughtError) {
        setDocumentEvidence(null);

        if (caughtError instanceof ApiClientError && caughtError.status === 401) {
          handleUnauthorized();
          return;
        }

        setDocumentEvidenceError(
          "No fue posible cargar la evidencia documental en este momento.",
        );
      } finally {
        setIsLoadingDocumentEvidence(false);
      }

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

  async function downloadPdf() {
    if (!dailyLog) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsDownloadingPdf(true);

    try {
      const pdf = await downloadDailyLogPdf(dailyLog.id);
      const href = URL.createObjectURL(pdf);
      const link = document.createElement("a");
      link.href = href;
      link.download = getDailyLogPdfFileName(dailyLog);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError) {
        if (caughtError.status === 401) {
          handleUnauthorized();
          return;
        }

        if (caughtError.status === 404) {
          setError("No fue posible encontrar la bitácora para generar el PDF.");
          return;
        }

        setError(caughtError.message || "No fue posible descargar el PDF.");
        return;
      }

      setError("No fue posible descargar el PDF.");
    } finally {
      setIsDownloadingPdf(false);
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
          {dailyLog ? (
            <div className="toolbar">
              <button
                className="button secondary"
                disabled={isDownloadingPdf}
                onClick={downloadPdf}
                type="button"
              >
                {isDownloadingPdf ? "Descargando..." : "Descargar PDF"}
              </button>
              <Link
                className="button secondary"
                href={
                  dailyLog.projectId
                    ? `/daily-logs?projectId=${dailyLog.projectId}`
                    : "/projects"
                }
              >
                Volver
              </Link>
            </div>
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

            <InfoCard title="Evidencia documental">
              <DocumentEvidenceSection
                evidence={documentEvidence}
                error={documentEvidenceError}
                isDownloadingPdf={isDownloadingPdf}
                isLoading={isLoadingDocumentEvidence}
                onDownloadPdf={downloadPdf}
              />
            </InfoCard>

            <InfoCard title="Firmas digitales">
              <DigitalSignaturesSection
                dailyLogStatus={dailyLog.status}
                onClearSignature={(signerId) =>
                  setPreliminarySignatures((current) => ({
                    ...current,
                    [signerId]: null,
                  }))
                }
                onUseSignature={(signerId, signature) =>
                  setPreliminarySignatures((current) => ({
                    ...current,
                    [signerId]: signature,
                  }))
                }
                signatures={preliminarySignatures}
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

type DocumentEvidence = {
  dailyLogId: string;
  dailyLogShortId: string;
  projectId: string;
  projectName: string;
  logDate: string;
  status: string;
  isClosed: boolean;
  latestPdfVersion: number | null;
  documentId: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  generatedAt: string | null;
  generatedBy: {
    id: string;
    fullName: string | null;
  } | null;
  verificationCode: string | null;
  shortHash: string | null;
  publicVerificationUrl: string | null;
  auditSummary: {
    total: number;
    latest: Array<{
      action: string;
      createdAt: string;
      entityId: string;
      entityName: string;
      performedById: string | null;
    }>;
  };
  message: string;
};

type PreliminarySignature = {
  dataUrl: string;
  signedAt: string;
};

type SignatureRole = {
  id: string;
  role: string;
  title: string;
};

const SIGNATURE_ROLES: SignatureRole[] = [
  {
    id: "responsable",
    role: "Responsable / Residente",
    title: "Responsable / Residente",
  },
  {
    id: "director",
    role: "Director / Aprobador",
    title: "Director / Aprobador",
  },
  {
    id: "interventor",
    role: "Interventor / Inspector",
    title: "Interventor / Inspector",
  },
];

function DigitalSignaturesSection({
  dailyLogStatus,
  onClearSignature,
  onUseSignature,
  signatures,
}: {
  dailyLogStatus: string;
  onClearSignature: (signerId: string) => void;
  onUseSignature: (signerId: string, signature: PreliminarySignature) => void;
  signatures: Record<string, PreliminarySignature | null>;
}) {
  const isClosed = dailyLogStatus === "CLOSED";

  return (
    <div className="stack">
      <p className="muted">
        Esta firma es una captura visual preliminar. La persistencia formal se implementará en la siguiente fase.
      </p>
      <p className="muted">
        {isClosed
          ? "La bitácora está cerrada; puedes revisar o capturar firmas preliminares, pero aún no se guardan formalmente."
          : "La firma final será válida al cierre/aprobación según el flujo futuro."}
      </p>

      {SIGNATURE_ROLES.map((signer) => (
        <SignatureCaptureCard
          key={signer.id}
          onClear={() => onClearSignature(signer.id)}
          onUseSignature={(signature) => onUseSignature(signer.id, signature)}
          signature={signatures[signer.id] ?? null}
          signer={signer}
        />
      ))}
    </div>
  );
}

function SignatureCaptureCard({
  onClear,
  onUseSignature,
  signature,
  signer,
}: {
  onClear: () => void;
  onUseSignature: (signature: PreliminarySignature) => void;
  signature: PreliminarySignature | null;
  signer: SignatureRole;
}) {
  return (
    <div className="panel">
      <div className="status-row">
        <div>
          <h3>{signer.title}</h3>
          <p className="muted">
            <strong>Nombre:</strong> {signature ? "Firma capturada en sesión" : "Pendiente"}
          </p>
          <p className="muted">
            <strong>Rol:</strong> {signer.role}
          </p>
          <p className="muted">
            <strong>Fecha/hora:</strong>{" "}
            {signature ? formatDateTime(signature.signedAt) : "No disponible"}
          </p>
        </div>
        <span className="badge">{signature ? "Firmado" : "Pendiente"}</span>
      </div>

      <SignaturePad
        onClear={onClear}
        onUseSignature={(dataUrl) =>
          onUseSignature({
            dataUrl,
            signedAt: new Date().toISOString(),
          })
        }
      />

      {signature ? (
        <div className="stack">
          <p className="muted">Previsualización de firma capturada:</p>
          <img
            alt={`Firma preliminar ${signer.role}`}
            src={signature.dataUrl}
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 6,
              maxHeight: 120,
              maxWidth: "100%",
              objectFit: "contain",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function SignaturePad({
  onClear,
  onUseSignature,
}: {
  onClear: () => void;
  onUseSignature: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    clearCanvas(canvasRef.current);
  }, []);

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    const point = getCanvasPoint(canvas, event);
    isDrawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function draw(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    const point = getCanvasPoint(canvas, event);
    context.lineTo(point.x, point.y);
    context.strokeStyle = "#17202a";
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();
    hasInkRef.current = true;
    setHasInk(true);
  }

  function stopDrawing(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) {
      return;
    }

    isDrawingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function clearSignature() {
    clearCanvas(canvasRef.current);
    hasInkRef.current = false;
    setHasInk(false);
    onClear();
  }

  function useSignature() {
    const canvas = canvasRef.current;

    if (!canvas || !hasInkRef.current) {
      return;
    }

    onUseSignature(canvas.toDataURL("image/png"));
  }

  return (
    <div className="stack">
      <canvas
        aria-label="Área visual de firma"
        height={170}
        onPointerCancel={stopDrawing}
        onPointerDown={startDrawing}
        onPointerLeave={stopDrawing}
        onPointerMove={draw}
        onPointerUp={stopDrawing}
        ref={canvasRef}
        style={{
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: 6,
          height: 170,
          maxWidth: "100%",
          touchAction: "none",
          width: "100%",
        }}
        width={520}
      />
      <div className="toolbar">
        <button className="button secondary" onClick={clearSignature} type="button">
          Limpiar firma
        </button>
        <button
          className="button"
          disabled={!hasInk}
          onClick={useSignature}
          type="button"
        >
          Usar firma
        </button>
      </div>
    </div>
  );
}

function DocumentEvidenceSection({
  evidence,
  error,
  isDownloadingPdf,
  isLoading,
  onDownloadPdf,
}: {
  evidence: DocumentEvidence | null;
  error: string | null;
  isDownloadingPdf: boolean;
  isLoading: boolean;
  onDownloadPdf: () => void;
}) {
  if (isLoading) {
    return <p className="muted">Cargando evidencia documental...</p>;
  }

  if (error) {
    return <p className="form-error">{error}</p>;
  }

  if (!evidence) {
    return (
      <p className="muted">
        No hay evidencia documental disponible para esta bitácora.
      </p>
    );
  }

  if (!evidence.isClosed) {
    return (
      <div className="stack">
        <p className="muted">
          La evidencia documental final estará disponible cuando la bitácora sea cerrada.
        </p>
        <p className="muted">{evidence.message}</p>
      </div>
    );
  }

  if (!evidence.documentId) {
    return (
      <div className="stack">
        <p className="muted">No hay evidencia documental final disponible.</p>
        <p className="muted">{evidence.message}</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="status-row">
        <span className="badge">Estado: {evidence.status}</span>
        <span className="badge">
          Versión PDF: {evidence.latestPdfVersion ?? "No disponible"}
        </span>
      </div>

      <div className="metadata-grid">
        <EvidenceField label="Nombre del archivo" value={evidence.fileName} />
        <EvidenceField label="Tipo MIME" value={evidence.mimeType} />
        <EvidenceField label="Tamaño" value={formatFileSize(evidence.fileSize)} />
        <EvidenceField
          label="Fecha/hora de generación"
          value={
            evidence.generatedAt
              ? formatDateTime(evidence.generatedAt)
              : "No disponible"
          }
        />
        <EvidenceField
          label="Generado por"
          value={formatGeneratedBy(evidence.generatedBy)}
        />
        <EvidenceField
          label="Código de verificación"
          value={evidence.verificationCode}
        />
        <EvidenceField label="Hash corto seguro" value={evidence.shortHash} />
        <EvidenceField
          label="Estado documental"
          value={evidence.message || "Evidencia documental final disponible."}
        />
      </div>

      <div>
        <h3>Resumen básico de auditoría</h3>
        <p className="muted">Registros relacionados: {evidence.auditSummary.total}</p>
        {evidence.auditSummary.latest.length > 0 ? (
          <ul>
            {evidence.auditSummary.latest.map((item) => (
              <li key={`${item.entityName}-${item.entityId}-${item.createdAt}`}>
                <strong>{item.action}</strong> · {item.entityName} ·{" "}
                {formatDateTime(item.createdAt)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Sin registros de auditoría relacionados.</p>
        )}
      </div>

      <div className="toolbar">
        {evidence.publicVerificationUrl ? (
          <a
            className="button secondary"
            href={evidence.publicVerificationUrl}
            rel="noreferrer"
            target="_blank"
          >
            Verificación pública
          </a>
        ) : null}
        <button
          className="button secondary"
          disabled={isDownloadingPdf}
          onClick={onDownloadPdf}
          type="button"
        >
          {isDownloadingPdf ? "Descargando..." : "Descargar PDF"}
        </button>
      </div>
    </div>
  );
}

function EvidenceField({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <p>
      <strong>{label}:</strong> {value || "No disponible"}
    </p>
  );
}

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

function formatGeneratedBy(
  value: DocumentEvidence["generatedBy"],
) {
  if (!value) {
    return "No disponible";
  }

  return value.fullName || formatTechnicalId(value.id);
}

function formatFileSize(value: number | null | undefined) {
  if (typeof value !== "number") {
    return "No disponible";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function clearCanvas(canvas: HTMLCanvasElement | null) {
  const context = canvas?.getContext("2d");

  if (!canvas || !context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
}

function getCanvasPoint(
  canvas: HTMLCanvasElement,
  event: PointerEvent<HTMLCanvasElement>,
) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function getDailyLogPdfFileName(dailyLog: DailyLog) {
  const datePart = formatDateForFileName(dailyLog.logDate);

  return `bitacora-${datePart || dailyLog.id}.pdf`;
}

function formatDateForFileName(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
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
