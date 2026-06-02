"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  WorkflowAction,
  WorkflowActions,
} from "@/components/workflow/WorkflowActions";
import { DailyLogSignature } from "@/lib/api-client";
import { DailyLog } from "@/types/daily-log";
import { DailyLogEvent } from "@/types/daily-log-event";

type DailyLogHeaderProps = {
  dailyLog: DailyLog;
  events: DailyLogEvent[];
  signatures: DailyLogSignature[];
  isDownloadingPdf: boolean;
  onDownloadPdf: () => void;
  onRunWorkflowAction: (action: WorkflowAction) => void;
  processingAction: string | null;
};

const statusConfig: Record<
  string,
  {
    icon: string;
    label: string;
    tone: string;
  }
> = {
  APPROVED: { icon: "✓", label: "Aprobada", tone: "approved" },
  CLOSED: { icon: "■", label: "Cerrada", tone: "closed" },
  DRAFT: { icon: "●", label: "Borrador", tone: "draft" },
  IN_REVIEW: { icon: "◐", label: "En revisión", tone: "review" },
  REJECTED: { icon: "×", label: "Rechazada", tone: "rejected" },
  VOIDED: { icon: "–", label: "Anulada", tone: "voided" },
};

export function DailyLogHeader({
  dailyLog,
  events,
  signatures,
  isDownloadingPdf,
  onDownloadPdf,
  onRunWorkflowAction,
  processingAction,
}: DailyLogHeaderProps) {
  const status = getStatusConfig(dailyLog.status);
  const summary = useMemo(
    () => ({
      attachmentCount: countAttachments(events),
      eventCount: events.length,
      signatureCount: signatures.length,
      updatedLabel: formatRelativeUpdate(dailyLog.updatedAt),
    }),
    [dailyLog.updatedAt, events, signatures.length],
  );
  const backHref = dailyLog.projectId
    ? `/daily-logs?projectId=${dailyLog.projectId}`
    : "/projects";

  return (
    <header className="daily-log-executive-header">
      <section className="daily-log-executive-main" aria-label="Resumen principal">
        <div className={`daily-log-status-pill daily-log-status-${status.tone}`}>
          <span aria-hidden="true" className="daily-log-status-icon">
            {status.icon}
          </span>
          <span>{status.label}</span>
        </div>

        <div className="daily-log-executive-title">
          <p className="eyebrow">Bitácora diaria</p>
          <h1>{formatFriendlyDate(dailyLog.logDate)}</h1>
          <p className="muted">{getDailyLogProjectLabel(dailyLog)}</p>
        </div>

        <div className="daily-log-responsible">
          <span>Responsable</span>
          <strong>{getResponsibleLabel(dailyLog)}</strong>
        </div>
      </section>

      <section className="daily-log-executive-summary" aria-label="Indicadores">
        <SummaryMetric label="Eventos" value={String(summary.eventCount)} />
        <SummaryMetric label="Adjuntos" value={String(summary.attachmentCount)} />
        <SummaryMetric label="Firmas" value={String(summary.signatureCount)} />
        <SummaryMetric label="Actualización" value={summary.updatedLabel} />
      </section>

      <section className="daily-log-executive-actions" aria-label="Acciones">
        <WorkflowActions
          dailyLogStatus={dailyLog.status}
          onRunAction={onRunWorkflowAction}
          processingAction={processingAction}
        />
        {processingAction ? <p className="muted">Procesando acción...</p> : null}
        <div className="daily-log-secondary-actions">
          <button
            className="button secondary"
            disabled={isDownloadingPdf}
            onClick={onDownloadPdf}
            type="button"
          >
            {isDownloadingPdf ? "Descargando..." : "Descargar PDF"}
          </button>
          <Link className="button secondary" href={backHref}>
            Volver
          </Link>
        </div>
      </section>
    </header>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="daily-log-summary-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getStatusConfig(status: string) {
  return statusConfig[status] ?? { icon: "●", label: status, tone: "default" };
}

function formatFriendlyDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "full",
    timeZone: "America/Bogota",
  }).format(date);
}

function formatRelativeUpdate(value: string | null | undefined) {
  if (!value) {
    return "Sin actualización";
  }

  const updatedAt = new Date(value);
  const now = new Date();
  const diffInMinutes = Math.max(
    0,
    Math.round((now.getTime() - updatedAt.getTime()) / 60000),
  );

  if (Number.isNaN(updatedAt.getTime())) {
    return "Sin actualización";
  }

  if (diffInMinutes < 1) {
    return "actualizada ahora";
  }

  if (diffInMinutes < 60) {
    return `actualizada hace ${diffInMinutes} min`;
  }

  const diffInHours = Math.round(diffInMinutes / 60);

  if (diffInHours < 24) {
    return `actualizada hace ${diffInHours} h`;
  }

  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    timeZone: "America/Bogota",
  }).format(updatedAt);
}

function countAttachments(events: DailyLogEvent[]) {
  return events.reduce((total, event) => {
    if (Array.isArray(event.attachments)) {
      return total + event.attachments.length;
    }

    return total + (event.attachmentCount ?? event.attachmentsCount ?? 0);
  }, 0);
}

function getDailyLogProjectLabel(dailyLog: DailyLog) {
  const dailyLogWithProject = dailyLog as DailyLog & {
    project?: {
      code?: string | null;
      name?: string | null;
    } | null;
    projectCode?: string | null;
    projectName?: string | null;
  };

  const projectCode =
    dailyLogWithProject.project?.code || dailyLogWithProject.projectCode;
  const projectName =
    dailyLogWithProject.project?.name || dailyLogWithProject.projectName;

  if (projectCode && projectName) {
    return `${projectCode} · ${projectName}`;
  }

  return projectName || projectCode || "Proyecto no disponible";
}

function getResponsibleLabel(dailyLog: DailyLog) {
  return (
    dailyLog.responsibleNameSnapshot ||
    getUserLabel(dailyLog.responsible) ||
    getUserLabel(dailyLog.createdBy) ||
    getUserLabel(dailyLog.user) ||
    "Responsable no disponible"
  );
}

type UserLabel = {
  email?: string | null;
  fullName?: string | null;
  name?: string | null;
};

function getUserLabel(value: UserLabel | null | undefined) {
  return value?.fullName || value?.name || value?.email || null;
}
