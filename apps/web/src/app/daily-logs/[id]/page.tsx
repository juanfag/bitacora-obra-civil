"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, PointerEvent } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { CreateDailyLogEventForm } from "@/components/daily-logs/events/CreateDailyLogEventForm";
import { DailyLogEventList } from "@/components/daily-logs/events/DailyLogEventList";
import { DailyLogDocumentEvidence } from "@/components/daily-log/daily-log-document-evidence";
import { DailyLogHeader } from "@/components/daily-log/daily-log-header";
import { DailyLogSignaturesTable } from "@/components/daily-log/daily-log-signatures-table";
import { InfoCard } from "@/components/ui/InfoCard";
import { StatusBadge } from "@/components/workflow/StatusBadge";
import { WorkflowAction } from "@/components/workflow/WorkflowActions";
import {
  ApiClientError,
  ControlledDocument,
  DailyLogAuditResponse,
  DailyLogSignature,
  DailyLogSignatureType,
  RelatedDocument,
  UserSignature,
  applyDailyLogSignature,
  apiRequest,
  createDocumentRelation,
  deleteDocumentRelation,
  downloadDailyLogPdf,
  downloadDocument,
  downloadDocumentVersion,
  getDailyLogAudit,
  getDailyLogDocuments,
  getDailyLogEventDocuments,
  getDailyLogEventAttachments,
  getDailyLogSignatures,
  getDocuments,
  getEventTypes,
  getMySignature,
  uploadDailyLogEventAttachment,
} from "@/lib/api-client";
import { logout } from "@/lib/auth";
import {
  canCreateDailyLogEvent,
  isDailyLogReadOnly,
} from "@/lib/daily-log-workflow";
import { useCurrentPermissions } from "@/lib/use-current-permissions";
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
  const [dailyLogSignatures, setDailyLogSignatures] = useState<
    DailyLogSignature[]
  >([]);
  const [userSignature, setUserSignature] = useState<UserSignature | null>(null);
  const [signaturesError, setSignaturesError] = useState<string | null>(null);
  const [isLoadingSignatures, setIsLoadingSignatures] = useState(false);
  const [audit, setAudit] = useState<DailyLogAuditResponse | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [relatedDocuments, setRelatedDocuments] = useState<RelatedDocument[]>([]);
  const [availableDocuments, setAvailableDocuments] = useState<
    ControlledDocument[]
  >([]);
  const [relatedDocumentsError, setRelatedDocumentsError] = useState<
    string | null
  >(null);
  const [isLoadingRelatedDocuments, setIsLoadingRelatedDocuments] =
    useState(false);
  const [selectedRelatedDocumentId, setSelectedRelatedDocumentId] = useState("");
  const [documentRelationActionId, setDocumentRelationActionId] = useState<
    string | null
  >(null);
  const [signingType, setSigningType] = useState<DailyLogSignatureType | null>(
    null,
  );
  const permissions = useCurrentPermissions();
  const canCreateEvent = permissions.can("daily-log-events:create");
  const canUploadAttachments = permissions.can("attachments:create");
  const canApplySignature = permissions.can("daily-logs:update");
  const canDownloadPdf = permissions.can("daily-logs:read");
  const canReadDocuments = permissions.can("documents:read");
  const canRelateDocuments = permissions.can("documents:update");
  const allowedWorkflowActions = getAllowedWorkflowActions(permissions.can);

  const handleUnauthorized = useCallback(() => {
    logout();
    router.replace("/login");
  }, [router]);

  const loadDailyLog = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setEventTypesError(null);
    setDocumentEvidenceError(null);
    setSignaturesError(null);
    setAuditError(null);
    setRelatedDocumentsError(null);
    setDocumentEvidence(null);
    setDailyLogSignatures([]);
    setAudit(null);
    setRelatedDocuments([]);
    setAvailableDocuments([]);
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
      setIsLoadingSignatures(true);
      setIsLoadingAudit(true);
      setIsLoadingRelatedDocuments(canReadDocuments);

      if (canReadDocuments) {
        try {
          const [relatedResponse, availableResponse] = await Promise.all([
            getDailyLogDocuments(params.id),
            getDocuments({
              projectId: response.projectId,
              status: "ACTIVE",
              limit: 100,
            }),
          ]);

          setRelatedDocuments(relatedResponse);
          setAvailableDocuments(availableResponse.items);
        } catch (caughtError) {
          setRelatedDocuments([]);
          setAvailableDocuments([]);

          if (caughtError instanceof ApiClientError && caughtError.status === 401) {
            handleUnauthorized();
            return;
          }

          setRelatedDocumentsError(
            "No fue posible cargar los documentos relacionados.",
          );
        } finally {
          setIsLoadingRelatedDocuments(false);
        }
      }

      try {
        const [signaturesResponse, userSignatureResponse] = await Promise.all([
          getDailyLogSignatures(params.id),
          getMySignature(),
        ]);
        setDailyLogSignatures(signaturesResponse);
        setUserSignature(userSignatureResponse);
      } catch (caughtError) {
        setDailyLogSignatures([]);
        setUserSignature(null);

        if (caughtError instanceof ApiClientError && caughtError.status === 401) {
          handleUnauthorized();
          return;
        }

        setSignaturesError("No fue posible cargar las firmas digitales.");
      } finally {
        setIsLoadingSignatures(false);
      }

      try {
        const auditResponse = await getDailyLogAudit(params.id);
        setAudit(auditResponse);
      } catch (caughtError) {
        setAudit(null);

        if (caughtError instanceof ApiClientError && caughtError.status === 401) {
          handleUnauthorized();
          return;
        }

        setAuditError("No fue posible cargar la auditoría.");
      } finally {
        setIsLoadingAudit(false);
      }

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
  }, [canReadDocuments, handleUnauthorized, params.id]);

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

  async function associateDailyLogDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRelatedDocumentId) {
      setRelatedDocumentsError("Selecciona un documento para asociar.");
      return;
    }

    setDocumentRelationActionId(selectedRelatedDocumentId);
    setRelatedDocumentsError(null);
    setSuccessMessage(null);

    try {
      await createDocumentRelation(selectedRelatedDocumentId, {
        relationType: "DAILY_LOG",
        dailyLogId: params.id,
        metadata: {
          source: "daily_log_detail",
        },
      });
      setSelectedRelatedDocumentId("");
      await loadDailyLog();
      setSuccessMessage("Documento asociado correctamente.");
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError && caughtError.status === 401) {
        handleUnauthorized();
        return;
      }

      setRelatedDocumentsError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "No fue posible asociar el documento.",
      );
    } finally {
      setDocumentRelationActionId(null);
    }
  }

  async function removeDailyLogDocumentRelation(item: RelatedDocument) {
    const confirmed = window.confirm(
      `Seguro que deseas quitar la relacion con "${item.document.title}"?`,
    );

    if (!confirmed) {
      return;
    }

    setDocumentRelationActionId(item.relation.id);
    setRelatedDocumentsError(null);
    setSuccessMessage(null);

    try {
      await deleteDocumentRelation(item.document.id, item.relation.id);
      await loadDailyLog();
      setSuccessMessage("Relacion documental eliminada correctamente.");
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError && caughtError.status === 401) {
        handleUnauthorized();
        return;
      }

      setRelatedDocumentsError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "No fue posible quitar la relacion documental.",
      );
    } finally {
      setDocumentRelationActionId(null);
    }
  }

  async function downloadRelatedDocument(item: RelatedDocument) {
    setDocumentRelationActionId(item.relation.id);
    setRelatedDocumentsError(null);

    try {
      const response = item.document.currentVersion
        ? await downloadDocumentVersion(item.document.currentVersion.id)
        : await downloadDocument(item.document.id);
      const href = URL.createObjectURL(response.blob);
      const link = document.createElement("a");

      link.href = href;
      link.download =
        response.fileName ??
        item.document.currentVersion?.originalFileName ??
        item.document.currentVersion?.fileName ??
        item.document.fileName ??
        "documento";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(href), 60_000);
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError && caughtError.status === 401) {
        handleUnauthorized();
        return;
      }

      setRelatedDocumentsError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "No fue posible descargar el documento relacionado.",
      );
    } finally {
      setDocumentRelationActionId(null);
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

  async function signDailyLog(signatureType: DailyLogSignatureType) {
    setError(null);
    setSuccessMessage(null);
    setSignaturesError(null);
    setSigningType(signatureType);

    try {
      const signature = await applyDailyLogSignature(params.id, signatureType);
      setDailyLogSignatures((current) => [...current, signature]);
      setSuccessMessage("Firma aplicada correctamente.");
    } catch (caughtError) {
      if (caughtError instanceof ApiClientError) {
        if (caughtError.status === 401) {
          handleUnauthorized();
          return;
        }

        if (caughtError.status === 409) {
          setSignaturesError(caughtError.message);
          return;
        }

        setSignaturesError(caughtError.message || "No fue posible aplicar la firma.");
        return;
      }

      setSignaturesError("No fue posible aplicar la firma.");
    } finally {
      setSigningType(null);
    }
  }

  return (
    <AuthGuard>
      <section className="daily-log-detail-shell">
        {dailyLog ? (
          <DailyLogHeader
            allowedWorkflowActions={allowedWorkflowActions}
            canDownloadPdf={canDownloadPdf}
            dailyLog={dailyLog}
            events={dailyLogEvents}
            isDownloadingPdf={isDownloadingPdf}
            onDownloadPdf={downloadPdf}
            onRunWorkflowAction={runWorkflowAction}
            processingAction={processingAction}
            signatures={dailyLogSignatures}
          />
        ) : (
          <div className="page-header daily-log-hero">
            <div className="daily-log-title-block">
              <p className="eyebrow">Detalle de bitácora</p>
              <h1>Bitácora diaria</h1>
              <p className="muted">
                Revisa el estado actual, la evidencia documental y la trazabilidad
                operativa registrada.
              </p>
            </div>
            <Link className="button secondary" href="/projects">
              Volver
            </Link>
          </div>
        )}

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
          <div className="daily-log-document-stack">
            <InfoCard className="daily-log-section-card daily-log-section-summary" title="Resumen">
              <div className="status-row">
                <StatusBadge status={dailyLog.status} />
                <span className="badge">{formatDate(dailyLog.logDate)}</span>
              </div>
              <p className="muted">
                {dailyLog.comments ||
                  "No hay comentarios registrados para esta bitácora."}
              </p>
            </InfoCard>

            <InfoCard
              className="daily-log-section-card daily-log-section-primary events-panel"
              title="Eventos de la bitácora"
            >
              {isDailyLogReadOnly(dailyLog.status) ? (
                <p className="muted readonly-note">
                  Esta bitácora está en modo solo lectura. No se pueden agregar eventos ni adjuntos.
                </p>
              ) : null}

              {canCreateEvent && canCreateDailyLogEvent(dailyLog.status) ? (
                <CreateDailyLogEventForm
                  catalogError={eventTypesError}
                  dailyLogStatus={dailyLog.status}
                  eventTypes={eventTypes}
                  isSubmitting={isCreatingEvent}
                  onSubmit={createEvent}
                />
              ) : null}

              <DailyLogEventList
                canUploadAttachments={canUploadAttachments}
                dailyLogStatus={dailyLog.status}
                events={dailyLogEvents}
                eventTypes={eventTypes}
                onAttachmentUpload={uploadAttachment}
              />
            </InfoCard>

            <InfoCard
              className="daily-log-section-card daily-log-section-medium"
              title="Documentos relacionados"
            >
              <RelatedDocumentsSection
                actionId={documentRelationActionId}
                availableDocuments={availableDocuments}
                canDownload={canReadDocuments}
                canRelate={canRelateDocuments}
                error={relatedDocumentsError}
                isLoading={isLoadingRelatedDocuments}
                onAssociate={associateDailyLogDocument}
                onDownload={downloadRelatedDocument}
                onRemove={removeDailyLogDocumentRelation}
                relatedDocuments={relatedDocuments}
                selectedDocumentId={selectedRelatedDocumentId}
                setSelectedDocumentId={setSelectedRelatedDocumentId}
              />
            </InfoCard>

            <InfoCard
              className="daily-log-section-card daily-log-section-medium"
              title="Evidencia documental"
            >
              <DocumentEvidenceSection
                canDownloadPdf={canDownloadPdf}
                evidence={documentEvidence}
                error={documentEvidenceError}
                isDownloadingPdf={isDownloadingPdf}
                isLoading={isLoadingDocumentEvidence}
                onDownloadPdf={downloadPdf}
              />
            </InfoCard>

            <InfoCard
              className="daily-log-section-card daily-log-section-medium"
              title="Firmas digitales"
            >
              <DigitalSignaturesSection
                canApplySignature={canApplySignature}
                dailyLogStatus={dailyLog.status}
                error={signaturesError}
                isLoading={isLoadingSignatures}
                onSign={signDailyLog}
                signatures={dailyLogSignatures}
                signingType={signingType}
                userSignature={userSignature}
              />
            </InfoCard>

            <InfoCard
              className="daily-log-section-card daily-log-section-medium"
              title="Auditoría"
            >
              <AuditSection
                audit={audit}
                error={auditError}
                isLoading={isLoadingAudit}
                onRetry={loadDailyLog}
              />
            </InfoCard>

            <InfoCard
              className="daily-log-section-card daily-log-section-low daily-log-metadata-section"
              title="Metadatos"
            >
              <div className="daily-log-metadata-grid">
                <p>
                  <strong>Proyecto</strong>
                  <span>{getDailyLogProjectLabel(dailyLog)}</span>
                </p>
                <p>
                  <strong>Creado</strong>
                  <span>
                    {dailyLog.createdAt
                      ? formatDateTime(dailyLog.createdAt)
                      : "No disponible"}
                  </span>
                </p>
                <p>
                  <strong>Actualizado</strong>
                  <span>
                    {dailyLog.updatedAt
                      ? formatDateTime(dailyLog.updatedAt)
                      : "No disponible"}
                  </span>
                </p>
              </div>
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

function getAllowedWorkflowActions(can: (permission: string) => boolean) {
  const actions: WorkflowAction[] = [];

  if (can("daily_logs:submit")) {
    actions.push("submit");
  }

  if (can("daily_logs:approve")) {
    actions.push("approve");
  }

  if (can("daily_logs:reject")) {
    actions.push("reject");
  }

  if (can("daily_logs:close")) {
    actions.push("close");
  }

  if (can("daily-logs:update")) {
    actions.push("return-to-draft");
  }

  return actions;
}

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

function DigitalSignaturesSection({
  canApplySignature,
  dailyLogStatus,
  error,
  isLoading,
  onSign,
  signatures,
  signingType,
  userSignature,
}: {
  canApplySignature: boolean;
  dailyLogStatus: string;
  error: string | null;
  isLoading: boolean;
  onSign: (signatureType: DailyLogSignatureType) => void;
  signatures: DailyLogSignature[];
  signingType: DailyLogSignatureType | null;
  userSignature: UserSignature | null;
}) {
  return (
    <DailyLogSignaturesTable
      canApplySignature={canApplySignature}
      dailyLogStatus={dailyLogStatus}
      error={error}
      isLoading={isLoading}
      onSign={onSign}
      signatures={signatures}
      signingType={signingType}
      userSignature={userSignature}
    />
  );
}

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

function PreliminaryDigitalSignaturesSection({
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

function RelatedDocumentsSection({
  actionId,
  availableDocuments,
  canDownload,
  canRelate,
  error,
  isLoading,
  onAssociate,
  onDownload,
  onRemove,
  relatedDocuments,
  selectedDocumentId,
  setSelectedDocumentId,
}: {
  actionId: string | null;
  availableDocuments: ControlledDocument[];
  canDownload: boolean;
  canRelate: boolean;
  error: string | null;
  isLoading: boolean;
  onAssociate: (event: FormEvent<HTMLFormElement>) => void;
  onDownload: (item: RelatedDocument) => void;
  onRemove: (item: RelatedDocument) => void;
  relatedDocuments: RelatedDocument[];
  selectedDocumentId: string;
  setSelectedDocumentId: (documentId: string) => void;
}) {
  const relatedDocumentIds = new Set(
    relatedDocuments.map((item) => item.document.id),
  );
  const selectableDocuments = availableDocuments.filter(
    (document) => !relatedDocumentIds.has(document.id),
  );

  if (isLoading) {
    return <p className="muted">Cargando documentos relacionados...</p>;
  }

  return (
    <div className="related-documents-section">
      {canRelate ? (
        <form className="related-documents-form" onSubmit={onAssociate}>
          <label>
            Asociar documento existente
            <select
              value={selectedDocumentId}
              onChange={(event) => setSelectedDocumentId(event.target.value)}
            >
              <option value="">Selecciona un documento</option>
              {selectableDocuments.map((document) => (
                <option key={document.id} value={document.id}>
                  {[
                    document.code,
                    document.title,
                    document.category?.name ?? "Sin categoria",
                  ]
                    .filter(Boolean)
                    .join(" - ")}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button"
            disabled={!selectedDocumentId || actionId === selectedDocumentId}
            type="submit"
          >
            {actionId === selectedDocumentId ? "Asociando..." : "Asociar"}
          </button>
        </form>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      {relatedDocuments.length === 0 ? (
        <div className="document-evidence-state">
          <p className="muted">Sin documentos relacionados.</p>
        </div>
      ) : (
        <div className="related-documents-list">
          {relatedDocuments.map((item) => (
            <article className="related-document-card" key={item.relation.id}>
              <div>
                <div className="status-row">
                  <span className="badge">
                    {item.document.currentVersion
                      ? `V${item.document.currentVersion.versionNumber}`
                      : "Sin archivo"}
                  </span>
                  <span className="badge">
                    {formatDocumentStatus(item.document.status)}
                  </span>
                </div>
                <h3>{item.document.title}</h3>
                <p className="muted">
                  {[
                    item.document.code ?? "Sin codigo",
                    item.document.category?.name ?? "Sin categoria",
                    item.document.currentVersion?.originalFileName ??
                      item.document.fileName,
                    item.document.currentVersion?.mimeType ??
                      item.document.mimeType,
                    formatFileSize(
                      item.document.currentVersion?.sizeBytes ??
                        item.document.sizeBytes,
                    ),
                    formatDateTime(item.document.updatedAt),
                  ]
                    .filter(Boolean)
                    .join(" | ")}
                </p>
              </div>
              <div className="toolbar">
                {canDownload ? (
                  <button
                    className="button secondary"
                    disabled={actionId === item.relation.id}
                    onClick={() => onDownload(item)}
                    type="button"
                  >
                    {actionId === item.relation.id ? "Procesando..." : "Descargar"}
                  </button>
                ) : null}
                {canRelate ? (
                  <button
                    className="button secondary"
                    disabled={actionId === item.relation.id}
                    onClick={() => onRemove(item)}
                    type="button"
                  >
                    Quitar relacion
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
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

function AuditSection({
  audit,
  error,
  isLoading,
  onRetry,
}: {
  audit: DailyLogAuditResponse | null;
  error: string | null;
  isLoading: boolean;
  onRetry: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [selectedEntity, setSelectedEntity] = useState("ALL");

  if (isLoading) {
    return (
      <div className="audit-state">
        <span aria-hidden="true" className="audit-state-icon">
          ...
        </span>
        <div>
          <strong>Consultando trazabilidad</strong>
          <p className="muted">Cargando la línea de tiempo de auditoría.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="audit-state audit-state-error">
        <span aria-hidden="true" className="audit-state-icon">
          !
        </span>
        <div>
          <strong>No fue posible cargar la auditoría</strong>
          <p className="muted">{error}</p>
          <button className="button secondary" onClick={onRetry} type="button">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!audit || audit.items.length === 0) {
    return (
      <div className="audit-state">
        <span aria-hidden="true" className="audit-state-icon">
          0
        </span>
        <div>
          <strong>Sin eventos de auditoría</strong>
          <p className="muted">
            Cuando existan cambios, firmas o snapshots documentales, aparecerán
            aquí en orden cronológico.
          </p>
        </div>
      </div>
    );
  }

  const actionOptions = getUniqueAuditOptions(audit.items.map((item) => item.action));
  const entityOptions = getUniqueAuditOptions(audit.items.map((item) => item.entity));
  const normalizedSearch = normalizeAuditSearch(searchQuery);
  const filteredItems = audit.items.filter((item) => {
    const matchesAction =
      selectedAction === "ALL" || item.action === selectedAction;
    const matchesEntity =
      selectedEntity === "ALL" || item.entity === selectedEntity;

    if (!matchesAction || !matchesEntity) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return getAuditSearchText(item).includes(normalizedSearch);
  });
  const hasActiveFilters =
    Boolean(normalizedSearch) ||
    selectedAction !== "ALL" ||
    selectedEntity !== "ALL";

  function clearAuditFilters() {
    setSearchQuery("");
    setSelectedAction("ALL");
    setSelectedEntity("ALL");
  }

  return (
    <div className="stack">
      <p className="muted">Línea de tiempo de eventos de la bitácora.</p>
      <div className="status-row">
        <span className="badge">Total: {audit.total}</span>
        <span className="badge">Orden: {audit.order}</span>
        <span className="badge">
          Mostrando {filteredItems.length} de {audit.items.length} eventos
        </span>
      </div>

      <div className="audit-filters" aria-label="Filtros de auditoría">
        <label>
          <span>Buscar</span>
          <input
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar en auditoría..."
            type="search"
            value={searchQuery}
          />
        </label>
        <label>
          <span>Acción</span>
          <select
            onChange={(event) => setSelectedAction(event.target.value)}
            value={selectedAction}
          >
            <option value="ALL">Todas las acciones</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {formatAuditAction(action)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Entidad</span>
          <select
            onChange={(event) => setSelectedEntity(event.target.value)}
            value={selectedEntity}
          >
            <option value="ALL">Todas las entidades</option>
            {entityOptions.map((entity) => (
              <option key={entity} value={entity}>
                {entity}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button secondary audit-clear-filters"
          disabled={!hasActiveFilters}
          onClick={clearAuditFilters}
          type="button"
        >
          Limpiar filtros
        </button>
      </div>

      {filteredItems.length === 0 ? (
        <div className="audit-state">
          <span aria-hidden="true" className="audit-state-icon">
            0
          </span>
          <div>
            <strong>Sin coincidencias</strong>
            <p className="muted">
              No hay eventos que coincidan con los filtros aplicados.
            </p>
          </div>
        </div>
      ) : null}

      {filteredItems.length > 0 ? (
        <div className="audit-table" role="table" aria-label="Registros de auditoría">
          <div className="audit-table-head" role="row">
            <span role="columnheader">Acción</span>
            <span role="columnheader">Fecha/hora</span>
            <span role="columnheader">Usuario</span>
            <span role="columnheader">Detalle</span>
          </div>
          {filteredItems.map((item) => (
            <AuditTableRow item={item} key={item.id} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AuditTableRow({
  item,
}: {
  item: DailyLogAuditResponse["items"][number];
}) {
  return (
    <div className="audit-table-row" role="row">
      <span className="audit-table-action" role="cell">
        <span className={`audit-action-badge audit-badge-${getAuditActionTone(item.action)}`}>
          {formatAuditAction(item.action)}
        </span>
      </span>
      <span className="audit-table-date" role="cell">
        {formatDateTime(item.createdAt)}
      </span>
      <span className="audit-table-user" role="cell">
        {formatAuditActor(item)}
      </span>
      <span className="audit-table-detail" role="cell">
        {formatAuditDetail(item)}
      </span>
    </div>
  );
}

function AuditTimelineItem({
  item,
}: {
  item: DailyLogAuditResponse["items"][number];
}) {
  const oldSummary = summarizeAuditValue(item.oldValue);
  const newSummary = summarizeAuditValue(item.newValue);
  const hasChangeSummary = Boolean(oldSummary || newSummary);

  return (
    <div className="timeline-item audit-timeline-item">
      <span
        aria-hidden="true"
        className={`timeline-marker audit-marker audit-marker-${getAuditActionTone(
          item.action,
        )}`}
      >
        {getAuditActionIcon(item.action)}
      </span>
      <article className="card timeline-card audit-card">
        <div className="audit-card-header">
          <div>
            <div className="status-row audit-badges">
              <span className={`badge audit-badge audit-badge-${getAuditActionTone(item.action)}`}>
                {formatAuditAction(item.action)}
              </span>
              {isRelevantAuditAction(item.action) ? (
                <span className="badge audit-badge audit-badge-muted">
                  Relevante
                </span>
              ) : null}
            </div>
            <p className="audit-date">{formatDateTime(item.createdAt)}</p>
          </div>
          <span className="audit-entity">{item.entity}</span>
        </div>

        <div className="audit-meta-grid">
          <p>
            <strong>Usuario</strong>
            <span>{formatAuditActor(item)}</span>
          </p>
          <p>
            <strong>Entidad</strong>
            <span>{item.entity}</span>
          </p>
        </div>

        {hasChangeSummary ? (
          <div className="audit-change-grid">
            {oldSummary ? (
              <AuditValueSummary label="Antes" summary={oldSummary} />
            ) : null}
            {newSummary ? (
              <AuditValueSummary label="Después" summary={newSummary} />
            ) : null}
          </div>
        ) : null}
      </article>
    </div>
  );
}

function AuditValueSummary({
  label,
  summary,
}: {
  label: string;
  summary: string;
}) {
  return (
    <div className="audit-change">
      <strong>{label}</strong>
      <span>{summary}</span>
    </div>
  );
}

function DocumentEvidenceSection({
  canDownloadPdf,
  evidence,
  error,
  isDownloadingPdf,
  isLoading,
  onDownloadPdf,
}: {
  canDownloadPdf: boolean;
  evidence: DocumentEvidence | null;
  error: string | null;
  isDownloadingPdf: boolean;
  isLoading: boolean;
  onDownloadPdf: () => void;
}) {
  return (
    <DailyLogDocumentEvidence
      canDownloadPdf={canDownloadPdf}
      evidence={evidence}
      error={error}
      isDownloadingPdf={isDownloadingPdf}
      isLoading={isLoading}
      onDownloadPdf={onDownloadPdf}
    />
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
          relatedDocuments: event.relatedDocuments ?? [],
        };
      }

      try {
        const [attachments, relatedDocuments] = await Promise.all([
          getDailyLogEventAttachments(event.id),
          getDailyLogEventDocuments(event.id),
        ]);
        return {
          ...event,
          attachments,
          relatedDocuments,
        };
      } catch (caughtError) {
        if (caughtError instanceof ApiClientError && caughtError.status === 401) {
          throw caughtError;
        }

        return {
          ...event,
          attachments: event.attachments ?? [],
          relatedDocuments: event.relatedDocuments ?? [],
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

function getDailyLogProjectLabel(dailyLog: DailyLog) {
  const projectCode = dailyLog.project?.code || dailyLog.projectCode;
  const projectName = dailyLog.project?.name || dailyLog.projectName;

  if (projectCode && projectName) {
    return `${projectCode} - ${projectName}`;
  }

  return projectName || projectCode || "Proyecto no disponible";
}

function formatAuditAction(action: string) {
  const labels: Record<string, string> = {
    APPROVE: "Aprobación",
    CLOSE: "Cierre",
    CREATE: "Creación",
    DAILY_LOG_SIGNATURE_APPLIED: "Firma aplicada",
    DELETE: "Eliminación",
    DOWNLOAD: "Descarga",
    GENERATE_PDF: "PDF generado",
    REJECT: "Rechazo",
    SIGN: "Firma aplicada",
    SUBMIT: "Envío a revisión",
    UPDATE: "Actualización",
    VOID: "Anulación",
  };

  return labels[action] ?? humanizeAuditToken(action);
}

function getAuditActionIcon(action: string) {
  if (action.includes("SIGNATURE")) {
    return "S";
  }

  if (action.includes("PDF") || action.includes("SNAPSHOT")) {
    return "PDF";
  }

  const icons: Record<string, string> = {
    APPROVE: "OK",
    CLOSE: "CL",
    CREATE: "+",
    DELETE: "-",
    REJECT: "RJ",
    SUBMIT: "SR",
    UPDATE: "UP",
    VOID: "AN",
  };

  return icons[action] ?? "EV";
}

function getAuditActionTone(action: string) {
  if (action.includes("SIGNATURE")) {
    return "sign";
  }

  if (action.includes("PDF") || action.includes("SNAPSHOT")) {
    return "pdf";
  }

  const tones: Record<string, string> = {
    APPROVE: "success",
    CLOSE: "closed",
    CREATE: "create",
    DELETE: "danger",
    REJECT: "danger",
    SUBMIT: "review",
    UPDATE: "update",
    VOID: "danger",
  };

  return tones[action] ?? "default";
}

function formatAuditActor(item: DailyLogAuditResponse["items"][number]) {
  const directActor = getAuditActorCandidate(item);

  if (directActor) {
    return directActor;
  }

  const signerName = getAuditPrimitive(item.newValue, "signerName");
  const signerEmail = getAuditPrimitive(item.newValue, "signerEmail");

  if (signerName && signerEmail) {
    return `${signerName} (${signerEmail})`;
  }

  if (signerName) {
    return signerName;
  }

  return "Usuario no disponible";
}

function formatAuditDetail(item: DailyLogAuditResponse["items"][number]) {
  const oldSummary = summarizeAuditValue(item.oldValue);
  const newSummary = summarizeAuditValue(item.newValue);
  const summary = newSummary || oldSummary;

  if (item.action === "UPDATE" && summary) {
    return summary;
  }

  const details: Record<string, string> = {
    APPROVE: "Bitácora aprobada",
    CLOSE: "Bitácora cerrada",
    CREATE: "Bitácora creada",
    DAILY_LOG_SIGNATURE_APPLIED: "Firma digital aplicada",
    DELETE: "Registro eliminado",
    DOWNLOAD: "Descarga registrada",
    GENERATE_PDF: "PDF final generado",
    REJECT: "Bitácora rechazada",
    SUBMIT: "Bitácora enviada a aprobación",
    UPDATE: "Registro actualizado",
    VOID: "Bitácora anulada",
  };

  return details[item.action] ?? humanizeAuditToken(item.action);
}

function getAuditActorCandidate(item: DailyLogAuditResponse["items"][number]) {
  const record = item as DailyLogAuditResponse["items"][number] & {
    actor?: { email?: string | null; fullName?: string | null; name?: string | null } | null;
    user?: { email?: string | null; fullName?: string | null; name?: string | null } | null;
    userEmail?: string | null;
    userName?: string | null;
  };
  const candidate =
    record.actorNameSnapshot ||
    record.userName ||
    record.actorEmailSnapshot ||
    record.userEmail ||
    record.user?.fullName ||
    record.user?.name ||
    record.user?.email ||
    record.actor?.fullName ||
    record.actor?.name ||
    record.actor?.email ||
    null;

  if (!candidate || isSensitiveAuditText(candidate) || isUuidLike(candidate)) {
    return null;
  }

  return candidate;
}

function getAuditPrimitive(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const item = (value as Record<string, unknown>)[key];

  if (typeof item !== "string" || isSensitiveAuditText(item)) {
    return null;
  }

  return item;
}

function getUniqueAuditOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((first, second) =>
    formatAuditAction(first).localeCompare(formatAuditAction(second), "es"),
  );
}

function normalizeAuditSearch(value: string) {
  return value.trim().toLocaleLowerCase("es-CO");
}

function getAuditSearchText(item: DailyLogAuditResponse["items"][number]) {
  return normalizeAuditSearch(
    [
      item.action,
      formatAuditAction(item.action),
      item.entity,
      formatAuditActor(item),
      summarizeAuditValue(item.oldValue),
      summarizeAuditValue(item.newValue),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function isRelevantAuditAction(action: string) {
  return (
    action === "DAILY_LOG_SIGNATURE_APPLIED" ||
    action === "GENERATE_PDF" ||
    action === "SUBMIT" ||
    action === "APPROVE" ||
    action === "REJECT" ||
    action === "CLOSE" ||
    action === "VOID"
  );
}

function summarizeAuditValue(value: unknown) {
  const entries = collectAuditEntries(value).slice(0, 6);

  if (entries.length === 0) {
    return "";
  }

  return entries
    .map(([key, item]) => `${formatAuditKey(key)}: ${item}`)
    .join(" · ");
}

function collectAuditEntries(value: unknown, prefix = ""): Array<[string, string]> {
  if (!value || typeof value !== "object") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectAuditEntries(item, prefix ? `${prefix}.${index}` : String(index)),
    );
  }

  return Object.entries(value).flatMap(([key, item]) => {
    if (isSensitiveAuditKey(key)) {
      return [];
    }

    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (item === null || item === undefined) {
      return [];
    }

    if (typeof item === "object") {
      return collectAuditEntries(item, nextKey);
    }

    const text = String(item);

    if (isSensitiveAuditText(text)) {
      return [];
    }

    return [[nextKey, truncateText(text, 80)]];
  });
}

function formatAuditKey(value: string) {
  const labels: Record<string, string> = {
    dailyLogId: "Bitácora",
    operation: "Operación",
    projectId: "Proyecto",
    signedAt: "Firmado",
    signerName: "Firmante",
    signerRole: "Rol",
    signerUserId: "Usuario firmante",
    signatureType: "Tipo de firma",
    status: "Estado",
  };

  return labels[value] ?? value;
}

function isSensitiveAuditKey(key: string) {
  const normalized = key.toLowerCase();

  return (
    normalized.includes("base64") ||
    normalized.includes("checksum") ||
    normalized.includes("fileurl") ||
    normalized.includes("hash") ||
    normalized === "id" ||
    normalized.endsWith("id") ||
    normalized.includes("path") ||
    normalized.includes("snapshotpath") ||
    normalized.includes("storagepath")
  );
}

function isSensitiveAuditText(value: string) {
  return (
    value.includes("base64") ||
    value.includes("data:image") ||
    value.includes("storagePath") ||
    value.includes("uploads/") ||
    value.includes("uploads\\") ||
    value.includes("C:\\") ||
    value.includes("/mnt/") ||
    value.includes("apps/api") ||
    /^[a-f0-9]{64}$/i.test(value)
  );
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 3)}...`;
}

function humanizeAuditToken(value: string) {
  return value
    .toLocaleLowerCase("es-CO")
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toLocaleUpperCase("es-CO")}${part.slice(1)}`)
    .join(" ");
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
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

function formatDocumentStatus(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Borrador",
    ACTIVE: "Activo",
    IN_REVIEW: "En revision",
    APPROVED: "Aprobado",
    REJECTED: "Rechazado",
    ARCHIVED: "Archivado",
    SUPERSEDED: "Reemplazado",
    DELETED: "Eliminado",
  };

  return labels[status] ?? status;
}

function formatFileSize(value: number | null | undefined) {
  if (typeof value !== "number") {
    return null;
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
