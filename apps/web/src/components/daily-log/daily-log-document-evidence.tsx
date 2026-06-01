"use client";

type DocumentEvidence = {
  auditSummary: {
    latest: Array<{
      action: string;
      createdAt: string;
      entityId: string;
      entityName: string;
      userName?: string | null;
      user?: {
        fullName?: string | null;
        email?: string | null;
      } | null;
    }>;
    total: number;
  };
  documentId: string | null;
  fileName: string | null;
  fileSize: number | null;
  generatedAt: string | null;
  generatedBy: {
    fullName?: string | null;
    id: string;
  } | null;
  isClosed: boolean;
  latestPdfVersion: number | null;
  message: string;
  mimeType: string | null;
  publicVerificationUrl: string | null;
  shortHash: string | null;
  status: string;
  verificationCode: string | null;
};

type DailyLogDocumentEvidenceProps = {
  evidence: DocumentEvidence | null;
  error: string | null;
  isDownloadingPdf: boolean;
  isLoading: boolean;
  onDownloadPdf: () => void;
};

export function DailyLogDocumentEvidence({
  evidence,
  error,
  isDownloadingPdf,
  isLoading,
  onDownloadPdf,
}: DailyLogDocumentEvidenceProps) {
  if (isLoading) {
    return (
      <div className="document-evidence-state">
        <strong>Cargando evidencia documental</strong>
        <p>Estamos consultando el snapshot documental de la bitácora.</p>
      </div>
    );
  }

  if (error) {
    return <p className="form-error">{error}</p>;
  }

  if (!evidence) {
    return (
      <div className="document-evidence-state">
        <strong>Sin evidencia documental</strong>
        <p>No hay evidencia documental disponible para esta bitácora.</p>
      </div>
    );
  }

  if (!evidence.isClosed) {
    return (
      <div className="document-evidence-state">
        <strong>Evidencia final pendiente</strong>
        <p>
          La evidencia documental final estará disponible cuando la bitácora sea
          cerrada.
        </p>
        <p>{evidence.message}</p>
      </div>
    );
  }

  if (!evidence.documentId) {
    return (
      <div className="document-evidence-state">
        <strong>Snapshot pendiente</strong>
        <p>No hay evidencia documental final disponible.</p>
        <p>{evidence.message}</p>
      </div>
    );
  }

  return (
    <div className="document-evidence-center">
      <section className="document-evidence-primary">
        <div className="document-evidence-icon" aria-hidden="true">
          PDF
        </div>
        <div className="document-evidence-main">
          <span className="document-status-badge">
            {getDocumentStatusLabel(evidence)}
          </span>
          <h3>{getDocumentTitle(evidence)}</h3>
          <p>{evidence.fileName || "bitacora-final.pdf"}</p>
          <div className="document-evidence-generated">
            <span>Generado</span>
            <strong>
              {evidence.generatedAt
                ? formatDateTime(evidence.generatedAt)
                : "No disponible"}
            </strong>
          </div>
        </div>
        <div className="document-evidence-actions">
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
            className="button"
            disabled={isDownloadingPdf}
            onClick={onDownloadPdf}
            type="button"
          >
            {isDownloadingPdf ? "Descargando..." : "Descargar PDF"}
          </button>
        </div>
      </section>

      <section className="document-evidence-info-grid" aria-label="Información documental">
        <DocumentInfo label="Versión PDF" value={evidence.latestPdfVersion ?? "No disponible"} />
        <DocumentInfo label="Formato" value={formatMimeType(evidence.mimeType)} />
        <DocumentInfo label="Tamaño" value={formatFileSize(evidence.fileSize)} />
        <DocumentInfo label="Generado por" value={formatGeneratedBy(evidence.generatedBy)} />
        <DocumentInfo label="Código" value={evidence.verificationCode || "No disponible"} />
        <DocumentInfo label="Código hash" value={evidence.shortHash || "No disponible"} />
      </section>

      <section className="document-evidence-timeline">
        <div className="document-evidence-subheader">
          <h3>Trazabilidad documental</h3>
          <span>{evidence.auditSummary.total} registros</span>
        </div>
        {evidence.auditSummary.latest.length > 0 ? (
          <div
            aria-label="Trazabilidad documental"
            className="document-evidence-trace-table"
            role="table"
          >
            <div className="document-evidence-trace-head" role="row">
              <span role="columnheader">Evento</span>
              <span role="columnheader">Fecha/hora</span>
              <span role="columnheader">Usuario</span>
            </div>
            {evidence.auditSummary.latest.map((item) => (
              <div
                className="document-evidence-trace-row"
                key={`${item.entityName}-${item.entityId}-${item.createdAt}`}
                role="row"
              >
                <span className="document-evidence-trace-event" role="cell">
                  {formatAuditAction(item.action)}
                </span>
                <span className="document-evidence-trace-date" role="cell">
                  {formatDateTime(item.createdAt)}
                </span>
                <span className="document-evidence-trace-user" role="cell">
                  {formatAuditUser(item)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Sin registros documentales relacionados.</p>
        )}
      </section>
    </div>
  );
}

function DocumentInfo({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <p>
      <strong>{label}</strong>
      <span>{value}</span>
    </p>
  );
}

function getDocumentTitle(evidence: DocumentEvidence) {
  if (evidence.status === "CLOSED") {
    return "Bitácora final certificada";
  }

  return "Evidencia documental de bitácora";
}

function getDocumentStatusLabel(evidence: DocumentEvidence) {
  if (evidence.message) {
    return evidence.message;
  }

  if (evidence.status === "CLOSED") {
    return "Documento final validado";
  }

  return "Evidencia documental disponible";
}

function formatMimeType(value: string | null) {
  if (value === "application/pdf") {
    return "Documento PDF";
  }

  return value ? "Documento" : "No disponible";
}

function formatGeneratedBy(value: DocumentEvidence["generatedBy"]) {
  if (!value) {
    return "No disponible";
  }

  return value.fullName || "Usuario del sistema";
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

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "No disponible";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(date);
}

function formatAuditAction(action: string) {
  const labels: Record<string, string> = {
    APPROVE: "Bitácora aprobada",
    CLOSE: "Bitácora cerrada",
    CREATE: "Bitácora creada",
    DAILY_LOG_SIGNATURE_APPLIED: "Firma aplicada",
    GENERATE_PDF: "PDF generado",
    REJECT: "Bitácora rechazada",
    SUBMIT: "Enviada a aprobación",
    UPDATE: "Registro actualizado",
    VOID: "Bitácora anulada",
  };

  return labels[action] ?? "Evento documental";
}

function formatAuditUser(item: DocumentEvidence["auditSummary"]["latest"][number]) {
  return item.userName || item.user?.fullName || item.user?.email || "Usuario no disponible";
}
