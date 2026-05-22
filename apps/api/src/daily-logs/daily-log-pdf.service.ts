import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, RecordStatus } from "@prisma/client";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectAccessPolicy } from "../projects/project-access.policy";

const dailyLogPdfInclude = {
  approvedBy: {
    select: {
      email: true,
      fullName: true,
    },
  },
  createdBy: {
    select: {
      email: true,
      fullName: true,
    },
  },
  dailyLogEvents: {
    where: {
      deletedAt: null,
    },
    include: {
      attachments: {
        where: {
          status: RecordStatus.ACTIVE,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      eventType: true,
      reportedBy: {
        select: {
          email: true,
          fullName: true,
        },
      },
    },
    orderBy: {
      reportedAt: "asc",
    },
  },
  project: {
    include: {
      organization: true,
    },
  },
  reviewedBy: {
    select: {
      email: true,
      fullName: true,
    },
  },
  statusHistory: {
    include: {
      changedBy: {
        select: {
          email: true,
          fullName: true,
        },
      },
    },
    orderBy: {
      changedAt: "asc",
    },
  },
} satisfies Prisma.DailyLogInclude;

type DailyLogForPdf = Prisma.DailyLogGetPayload<{
  include: typeof dailyLogPdfInclude;
}>;

type EventForPdf = DailyLogForPdf["dailyLogEvents"][number];
type AttachmentForPdf = EventForPdf["attachments"][number];
type StatusHistoryForPdf = DailyLogForPdf["statusHistory"][number];

type EventPhotoEvidence = {
  photos: PhotoEvidence[];
  totalImages: number;
};

type PhotoEvidence = {
  attachment: AttachmentForPdf;
  imageBuffer: Buffer | null;
};

type RenderContext = {
  generatedAt: Date;
  generatedBy: string;
  header: {
    organization: string;
    project: string;
    status: string;
    subtitle: string;
    title: string;
  };
  verification: VerificationData;
};

type VerificationData = {
  code: string;
  hash: string;
  url: string;
};

const COLORS = {
  border: "#cbd5e1",
  fill: "#f8fafc",
  muted: "#64748b",
  primary: "#0f766e",
  softBorder: "#e2e8f0",
  text: "#17202a",
};

const PAGE = {
  bottom: 74,
  left: 54,
  right: 54,
  top: 54,
};

const MAX_PHOTO_EVIDENCE_PER_EVENT = 6;
const PHOTO_COLUMNS = 2;
const PHOTO_FIT: [number, number] = [220, 140];
const PHOTO_LABEL_HEIGHT = 32;
const PHOTO_PADDING = 7;

@Injectable()
export class DailyLogPdfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccessPolicy: ProjectAccessPolicy,
  ) {}

  async generate(id: string, generatedBy?: CurrentUserPayload) {
    const dailyLog = await this.prisma.dailyLog.findUnique({
      where: { id },
      include: dailyLogPdfInclude,
    });

    if (!dailyLog) {
      throw new NotFoundException("Daily log not found");
    }

    const verification = buildVerificationData(dailyLog);
    const context: RenderContext = {
      generatedAt: new Date(),
      generatedBy: formatPerson(generatedBy),
      header: {
        organization: sanitizeText(dailyLog.project.organization?.name, ""),
        project: formatProjectName(dailyLog.project.name, dailyLog.project.code),
        status: formatStatus(dailyLog.status),
        subtitle: `Fecha de bitácora: ${formatDate(dailyLog.logDate)} | ID: ${shortId(
          dailyLog.id,
        )}`,
        title: "Bitácora diaria de obra",
      },
      verification,
    };
    const photoEvidenceByEventId = await buildDailyLogPhotoEvidence(
      dailyLog.dailyLogEvents,
    );
    const verificationQr = await buildVerificationQr(verification.url);

    const buffer = await renderPdf(context, (doc) => {
      addHeader(doc, context);
      addGeneralInfoSection(doc, dailyLog);
      addEventsSection(doc, dailyLog.dailyLogEvents, photoEvidenceByEventId);
      addControlAndSignaturesSection(doc, dailyLog, context);
      addVerificationSection(doc, dailyLog, context, verificationQr);
    });

    return {
      buffer,
      fileName: `bitacora-${formatDateForFileName(dailyLog.logDate)}.pdf`,
    };
  }

  async verifyDocumentCode(
    id: string,
    providedCode: string | undefined,
    user: CurrentUserPayload,
  ) {
    const dailyLog = await this.prisma.dailyLog.findUnique({
      where: { id },
      include: dailyLogPdfInclude,
    });

    if (!dailyLog) {
      throw new NotFoundException("Daily log not found");
    }

    const canAccessProject = await this.projectAccessPolicy.canAccessProject(
      user.sub,
      dailyLog.projectId,
    );

    if (!canAccessProject) {
      throw new ForbiddenException("User does not have access to this project.");
    }

    const verification = buildVerificationData(dailyLog);
    const normalizedProvidedCode = providedCode?.trim() || null;
    const reason = getVerificationReason(
      verification.code,
      normalizedProvidedCode,
    );
    const verified = reason === "MATCH";
    const warning =
      dailyLog.status === "CLOSED"
        ? undefined
        : "La bitácora no está cerrada; su contenido aún puede cambiar.";

    return {
      dailyLogId: dailyLog.id,
      dailyLogShortId: shortId(dailyLog.id),
      generatedAt: new Date().toISOString(),
      isClosed: dailyLog.status === "CLOSED",
      logDate: formatDateForFileName(dailyLog.logDate),
      message: getVerificationMessage(reason),
      projectId: dailyLog.projectId,
      projectName: dailyLog.project.name,
      providedCode: normalizedProvidedCode,
      reason,
      status: dailyLog.status,
      verificationCode: verification.code,
      verified,
      ...(warning ? { warning } : {}),
    };
  }

  async verifyPublicDocumentCode(id: string, providedCode: string | undefined) {
    const normalizedProvidedCode = providedCode?.trim() || null;

    if (!normalizedProvidedCode) {
      throw new BadRequestException("No se recibió código de verificación.");
    }

    const dailyLog = await this.prisma.dailyLog.findUnique({
      where: { id },
      include: dailyLogPdfInclude,
    });

    if (!dailyLog) {
      throw new NotFoundException("Daily log not found");
    }

    const verification = buildVerificationData(dailyLog);
    const reason = getVerificationReason(
      verification.code,
      normalizedProvidedCode,
    );
    const warning =
      dailyLog.status === "CLOSED"
        ? undefined
        : "La bitácora no está cerrada; su contenido aún puede cambiar.";

    return {
      dailyLogShortId: shortId(dailyLog.id),
      generatedAt: new Date().toISOString(),
      isClosed: dailyLog.status === "CLOSED",
      logDate: formatDateForFileName(dailyLog.logDate),
      message: getVerificationMessage(reason),
      projectName: dailyLog.project.name,
      providedCode: normalizedProvidedCode,
      reason,
      status: dailyLog.status,
      verified: reason === "MATCH",
      ...(warning ? { warning } : {}),
    };
  }
}

function renderPdf(
  context: RenderContext,
  draw: (doc: PDFKit.PDFDocument) => void,
) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      autoFirstPage: true,
      bufferPages: true,
      margins: PAGE,
      size: "LETTER",
    });

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    draw(doc);
    addFooters(doc, context);
    doc.end();
  });
}

async function buildDailyLogPhotoEvidence(events: EventForPdf[]) {
  const evidenceByEventId = new Map<string, EventPhotoEvidence>();

  for (const event of events) {
    evidenceByEventId.set(event.id, await buildEventPhotoEvidenceSection(event));
  }

  return evidenceByEventId;
}

function buildVerificationData(dailyLog: DailyLogForPdf): VerificationData {
  const hash = createHash("sha256")
    .update(JSON.stringify(buildDocumentHashPayload(dailyLog)))
    .digest("hex");
  const code = hash.slice(0, 16);
  const baseUrl = getPublicAppUrl();

  return {
    code,
    hash,
    url: `${baseUrl}/public/verify/${encodeURIComponent(
      dailyLog.id,
    )}?code=${encodeURIComponent(code)}`,
  };
}

function getVerificationReason(
  expectedCode: string,
  providedCode: string | null,
) {
  if (!providedCode) {
    return "MISSING_CODE";
  }

  if (providedCode !== expectedCode) {
    return "CODE_MISMATCH";
  }

  return "MATCH";
}

function getVerificationMessage(reason: string) {
  const messages: Record<string, string> = {
    CODE_MISMATCH:
      "El código recibido no coincide con el registro digital actual.",
    MATCH: "Documento verificado contra los registros digitales del sistema.",
    MISSING_CODE: "No se recibió código de verificación.",
  };

  return messages[reason] ?? messages.CODE_MISMATCH;
}

function buildDocumentHashPayload(dailyLog: DailyLogForPdf) {
  return {
    attachments: dailyLog.dailyLogEvents.flatMap((event) =>
      event.attachments.map((attachment) => ({
        checksumSha256: attachment.checksumSha256 ?? null,
        id: attachment.id,
      })),
    ),
    dailyLogId: dailyLog.id,
    events: dailyLog.dailyLogEvents.map((event) => event.id),
    logDate: formatDateForFileName(dailyLog.logDate),
    projectId: dailyLog.projectId,
    status: dailyLog.status,
    statusHistory: dailyLog.statusHistory.map((item) => ({
      changedAt: item.changedAt.toISOString(),
      id: item.id,
      toStatus: item.toStatus,
    })),
    updatedAt: dailyLog.updatedAt.toISOString(),
  };
}

function getPublicAppUrl() {
  return (
    process.env.FRONTEND_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/g, "");
}

async function buildVerificationQr(url: string) {
  try {
    return await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 1,
      scale: 4,
      type: "image/png",
    });
  } catch {
    return null;
  }
}

async function buildEventPhotoEvidenceSection(event: EventForPdf) {
  const embeddableImages = event.attachments.filter(isPdfEmbeddableImage);
  const limitedImages = embeddableImages.slice(0, MAX_PHOTO_EVIDENCE_PER_EVENT);
  const photos = await Promise.all(
    limitedImages.map(async (attachment) => ({
      attachment,
      imageBuffer: await getImageBufferForPdf(attachment),
    })),
  );

  return {
    photos,
    totalImages: embeddableImages.length,
  };
}

function isPdfEmbeddableImage(attachment: AttachmentForPdf) {
  const mimeType = getAttachmentMimeTypeForPdf(attachment);

  return mimeType === "image/jpeg" || mimeType === "image/png";
}

function resolveAttachmentFilePath(attachment: AttachmentForPdf) {
  return attachment.storagePath || attachment.path || null;
}

async function getImageBufferForPdf(attachment: AttachmentForPdf) {
  const filePath = resolveAttachmentFilePath(attachment);

  if (!filePath || !isPdfEmbeddableImage(attachment)) {
    return null;
  }

  try {
    await access(filePath, constants.R_OK);
    return await readFile(filePath);
  } catch {
    return null;
  }
}

function addHeader(doc: PDFKit.PDFDocument, context: RenderContext) {
  const width = contentWidth(doc);
  const startY = doc.y;

  doc
    .roundedRect(PAGE.left, startY, width, 94, 6)
    .fillAndStroke(COLORS.fill, COLORS.border);

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(
      context.header.organization || "Organización no disponible",
      PAGE.left + 16,
      startY + 14,
      { width: width - 32 },
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(COLORS.text)
    .text(context.header.title, PAGE.left + 16, startY + 31, {
      width: width - 32,
    });

  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLORS.text)
    .text(context.header.project, PAGE.left + 16, startY + 56, {
      width: width - 180,
    });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(context.header.subtitle, PAGE.left + 16, startY + 72, {
      width: width - 32,
    });

  addStatusPill(doc, context.header.status, PAGE.left + width - 150, startY + 28);

  doc.y = startY + 112;
}

function addStatusPill(
  doc: PDFKit.PDFDocument,
  status: string,
  x: number,
  y: number,
) {
  doc.roundedRect(x, y, 122, 24, 12).fill(COLORS.primary);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#ffffff")
    .text(status, x + 10, y + 7, {
      align: "center",
      width: 102,
    });
}

function addGeneralInfoSection(
  doc: PDFKit.PDFDocument,
  dailyLog: DailyLogForPdf,
) {
  addSectionTitle(doc, "Información general");
  addInfoGrid(doc, [
    ["Proyecto", formatProjectName(dailyLog.project.name, dailyLog.project.code)],
    ["Organización", dailyLog.project.organization?.name],
    ["Ubicación", dailyLog.project.location],
    ["Responsable / creador", formatPerson(dailyLog.createdBy)],
    ["Fecha de bitácora", formatDate(dailyLog.logDate)],
    ["Fecha de creación", formatDateTime(dailyLog.createdAt)],
    ["Fecha de aprobación", formatDateTime(dailyLog.approvedAt)],
    ["Fecha de cierre", formatDateTime(dailyLog.closedAt)],
    ["Comentarios generales", dailyLog.comments],
  ]);
}

function addEventsSection(
  doc: PDFKit.PDFDocument,
  events: EventForPdf[],
  photoEvidenceByEventId: Map<string, EventPhotoEvidence>,
) {
  addSectionTitle(doc, "Eventos");

  if (events.length === 0) {
    addEmptyState(doc, "No hay eventos registrados para esta bitácora.");
    return;
  }

  events.forEach((event, index) =>
    addEventBlock(
      doc,
      event,
      index,
      photoEvidenceByEventId.get(event.id) ?? { photos: [], totalImages: 0 },
    ),
  );
}

function addEventBlock(
  doc: PDFKit.PDFDocument,
  event: EventForPdf,
  index: number,
  photoEvidence: EventPhotoEvidence,
) {
  ensureSpace(doc, 152);

  const blockX = PAGE.left;
  const blockWidth = contentWidth(doc);
  const contentX = blockX + 12;
  const contentWidthValue = blockWidth - 24;
  const topY = doc.y;

  doc
    .strokeColor(COLORS.softBorder)
    .lineWidth(0.8)
    .moveTo(blockX, topY)
    .lineTo(blockX + blockWidth, topY)
    .stroke();

  doc.y = topY + 10;
  doc.x = contentX;

  const eventDate = formatDateTime(event.reportedAt ?? event.createdAt);
  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor(COLORS.primary)
    .text(`${index + 1}. ${formatEventType(event)}`, contentX, doc.y, {
      width: contentWidthValue - 132,
    });

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(COLORS.muted)
    .text(eventDate, contentX + contentWidthValue - 126, topY + 12, {
      align: "right",
      width: 126,
    });

  doc.moveDown(0.35);
  addKeyValueLine(doc, "Actividad", event.activity, contentX, contentWidthValue);
  addKeyValueLine(
    doc,
    "Reportado por",
    formatPerson(event.reportedBy),
    contentX,
    contentWidthValue,
  );
  addKeyValueLine(
    doc,
    "Adjuntos",
    `${event.attachments.length}`,
    contentX,
    contentWidthValue,
  );

  addTextBlock(
    doc,
    "Descripción de ejecución",
    event.executionDescription,
    contentX,
    contentWidthValue,
  );

  addAttachmentList(doc, event.attachments, contentX, contentWidthValue);
  addPhotoEvidenceSection(doc, photoEvidence, contentX, contentWidthValue);
  doc.x = PAGE.left;
  doc.moveDown(0.7);
}

function addControlAndSignaturesSection(
  doc: PDFKit.PDFDocument,
  dailyLog: DailyLogForPdf,
  context: RenderContext,
) {
  const workflow = buildWorkflowTransitionSummary(dailyLog);

  addSectionTitle(doc, "Control y firmas");
  addInfoGrid(doc, [
    ["Estado documental final", formatStatus(dailyLog.status)],
    ["Elaborado por", formatPerson(dailyLog.createdBy)],
    ["Fecha de elaboracion", formatDateTime(dailyLog.createdAt)],
    ["Enviado a revision por", formatWorkflowAction(workflow.submitted)],
    ["Aprobado por", formatWorkflowAction(workflow.approved)],
    ["Cerrado por", formatWorkflowAction(workflow.closed)],
    ["Rechazado", formatWorkflowAction(workflow.rejected)],
    ["Anulado / cancelado", formatWorkflowAction(workflow.voided)],
    ["Generado por", context.generatedBy],
    ["Fecha/hora de generación", formatDateTime(context.generatedAt)],
  ]);

  addStatusHistory(doc, dailyLog.statusHistory);
  addDigitalRecordLegend(doc);
  addFormalSignatureBlocks(doc, dailyLog, workflow);
}

type WorkflowActionSummary = {
  comments?: string | null;
  date?: Date | null;
  user?: { email: string | null; fullName: string | null } | null;
};

type WorkflowTransitionSummary = {
  approved: WorkflowActionSummary;
  closed: WorkflowActionSummary;
  rejected: WorkflowActionSummary;
  submitted: WorkflowActionSummary;
  voided: WorkflowActionSummary;
};

function buildWorkflowTransitionSummary(
  dailyLog: DailyLogForPdf,
): WorkflowTransitionSummary {
  const submitted = findLastTransition(dailyLog.statusHistory, "IN_REVIEW");
  const approved = findLastTransition(dailyLog.statusHistory, "APPROVED");
  const closed = findLastTransition(dailyLog.statusHistory, "CLOSED");
  const rejected = findLastTransition(dailyLog.statusHistory, "REJECTED");
  const voided =
    findLastTransition(dailyLog.statusHistory, "VOIDED") ??
    findLastTransition(dailyLog.statusHistory, "CANCELLED");

  return {
    approved: {
      comments: approved?.comments ?? null,
      date: dailyLog.approvedAt ?? approved?.changedAt ?? null,
      user: dailyLog.approvedBy ?? approved?.changedBy ?? null,
    },
    closed: {
      comments: closed?.comments ?? null,
      date: dailyLog.closedAt ?? closed?.changedAt ?? null,
      user: closed?.changedBy ?? null,
    },
    rejected: {
      comments: rejected?.comments ?? null,
      date: dailyLog.reviewedAt ?? rejected?.changedAt ?? null,
      user: dailyLog.reviewedBy ?? rejected?.changedBy ?? null,
    },
    submitted: {
      comments: submitted?.comments ?? null,
      date: dailyLog.submittedAt ?? submitted?.changedAt ?? null,
      user: submitted?.changedBy ?? null,
    },
    voided: {
      comments: voided?.comments ?? null,
      date: voided?.changedAt ?? null,
      user: voided?.changedBy ?? null,
    },
  };
}

function findLastTransition(
  statusHistory: StatusHistoryForPdf[],
  status: string,
) {
  return [...statusHistory]
    .reverse()
    .find((item) => item.toStatus === status);
}

function formatWorkflowAction(action: WorkflowActionSummary) {
  if (!action.date && !action.user && !action.comments) {
    return "Pendiente";
  }

  const details = [
    action.user ? formatPerson(action.user) : "Pendiente",
    formatDateTime(action.date),
    action.comments ? `Motivo: ${sanitizeText(action.comments)}` : null,
  ].filter((value) => value && value !== "No disponible");

  return details.join(" | ");
}

function addDigitalRecordLegend(doc: PDFKit.PDFDocument) {
  ensureSpace(doc, 92);
  doc.moveDown(0.7);
  doc
    .roundedRect(PAGE.left, doc.y, contentWidth(doc), 78, 5)
    .fillAndStroke(COLORS.fill, COLORS.softBorder);

  const textX = PAGE.left + 14;
  const textY = doc.y + 12;
  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor(COLORS.text)
    .text("Validez del registro digital", textX, textY, {
      width: contentWidth(doc) - 28,
    });
  doc
    .font("Helvetica")
    .fontSize(8.8)
    .fillColor(COLORS.text)
    .text(
      "Este documento corresponde al registro digital de la bitacora diaria de obra. La informacion contenida fue generada a partir de los eventos, adjuntos, usuarios y transiciones registrados en el sistema.",
      textX,
      textY + 16,
      {
        lineGap: 1.4,
        width: contentWidth(doc) - 28,
      },
    );
  doc
    .font("Helvetica")
    .fontSize(8.8)
    .fillColor(COLORS.muted)
    .text(
      "Las evidencias documentales adicionales se conservan como adjuntos digitales asociados a la bitacora.",
      textX,
      textY + 48,
      {
        lineGap: 1.4,
        width: contentWidth(doc) - 28,
      },
    );
  doc.y += 88;
}

function addFormalSignatureBlocks(
  doc: PDFKit.PDFDocument,
  dailyLog: DailyLogForPdf,
  workflow: WorkflowTransitionSummary,
) {
  addSectionTitle(doc, "Bloque formal de firmas");

  const blocks = [
    {
      date: dailyLog.createdAt,
      person: dailyLog.createdBy,
      role: "Responsable / Residente",
      title: "Responsable / Residente",
    },
    {
      date: workflow.approved.date,
      person: workflow.approved.user,
      role: "Director / Aprobador",
      title: "Director / Aprobador",
    },
    {
      date: null,
      person: null,
      role: "Interventor / Inspector",
      title: "Interventor / Inspector",
    },
  ];

  blocks.forEach((block) => addSignatureCard(doc, block));
}

function addVerificationSection(
  doc: PDFKit.PDFDocument,
  dailyLog: DailyLogForPdf,
  context: RenderContext,
  qrDataUri: string | null,
) {
  ensureSpace(doc, 168);
  addSectionTitle(doc, "Verificación documental");

  const x = PAGE.left;
  const y = doc.y;
  const width = contentWidth(doc);
  const qrSize = 96;
  doc
    .roundedRect(x, y, width, 132, 5)
    .fillAndStroke(COLORS.fill, COLORS.softBorder);

  if (qrDataUri) {
    try {
      doc.image(qrDataUri, x + 14, y + 16, {
        fit: [qrSize, qrSize],
      });
    } catch {
      addQrFallback(doc, x + 14, y + 56, qrSize);
    }
  } else {
    addQrFallback(doc, x + 14, y + 56, qrSize);
  }

  const textX = x + qrSize + 30;
  const textWidth = width - qrSize - 44;
  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor(COLORS.muted)
    .text("Documento verificable", textX, y + 4, {
      width: textWidth,
    });
  const statusNote =
    dailyLog.status === "CLOSED"
      ? "Documento cerrado. Cualquier modificación posterior deberá quedar registrada como nueva trazabilidad."
      : `Documento en estado ${formatStatus(dailyLog.status)}. Su contenido aún puede cambiar.`;

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(COLORS.text)
    .text("Código de verificación", textX, y + 14, {
      width: textWidth,
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor(COLORS.primary)
    .text(context.verification.code, textX, y + 31, {
      width: textWidth,
    });
  doc
    .font("Helvetica")
    .fontSize(8.8)
    .fillColor(COLORS.text)
    .text(`ID bitácora: ${shortId(dailyLog.id)}`, textX, y + 53, {
      width: textWidth,
    })
    .text(`Generado: ${formatDateTime(context.generatedAt)}`, {
      width: textWidth,
    })
    .text(`URL: ${context.verification.url}`, {
      lineGap: 1.2,
      width: textWidth,
    });
  doc
    .font("Helvetica")
    .fontSize(8.4)
    .fillColor(COLORS.muted)
    .text(
      "Este código permite contrastar la bitácora contra los registros digitales del sistema.",
      textX,
      y + 88,
      {
        lineGap: 1.2,
        width: textWidth,
      },
    )
    .text(sanitizeText(statusNote), {
      lineGap: 1.2,
      width: textWidth,
    });

  doc.y = y + 146;
}

function addQrFallback(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
) {
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(COLORS.muted)
    .text("QR no disponible", x, y, {
      align: "center",
      width,
    });
}

function addSignatureCard(
  doc: PDFKit.PDFDocument,
  block: {
    date: Date | null | undefined;
    person: { email: string | null; fullName: string | null } | null | undefined;
    role: string;
    title: string;
  },
) {
  ensureSpace(doc, 112);

  const x = PAGE.left;
  const y = doc.y;
  const width = contentWidth(doc);
  doc
    .roundedRect(x, y, width, 96, 5)
    .strokeColor(COLORS.softBorder)
    .lineWidth(0.7)
    .stroke();

  const leftX = x + 14;
  const rightX = x + width / 2 + 8;
  const innerWidth = width / 2 - 24;
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(COLORS.primary)
    .text(block.title, leftX, y + 12, {
      width: width - 28,
    });

  addSignatureField(doc, "Nombre", formatSignaturePerson(block.person), leftX, y + 34, innerWidth);
  addSignatureField(doc, "Cargo/Rol", block.role, rightX, y + 34, innerWidth);
  addSignatureField(doc, "Fecha", formatSignatureDate(block.date), leftX, y + 58, innerWidth);
  addSignatureField(doc, "Firma", "________________________________", rightX, y + 58, innerWidth);

  doc.y = y + 106;
}

function addSignatureField(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
) {
  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor(COLORS.muted)
    .text(`${label}:`, x, y, {
      width,
    });
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLORS.text)
    .text(value || "Pendiente", x, y + 11, {
      lineGap: 1.2,
      width,
    });
}

function formatSignaturePerson(
  value: { email: string | null; fullName: string | null } | null | undefined,
) {
  return value ? formatPerson(value) : "Pendiente";
}

function formatSignatureDate(value: Date | null | undefined) {
  return value ? formatDateTime(value) : "Pendiente";
}

function addStatusHistory(
  doc: PDFKit.PDFDocument,
  statusHistory: StatusHistoryForPdf[],
) {
  ensureSpace(doc, 42);
  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor(COLORS.text)
    .text("Historial básico", PAGE.left, doc.y, {
      width: contentWidth(doc),
    });
  doc.moveDown(0.2);

  if (statusHistory.length === 0) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text("Sin cambios de estado registrados.", {
        width: contentWidth(doc),
      });
    return;
  }

  statusHistory.forEach((item) => {
    ensureSpace(doc, 24);
    const line = `${formatDateTime(item.changedAt)} - ${formatStatus(
      item.fromStatus,
    )} a ${formatStatus(item.toStatus)} - ${formatPerson(item.changedBy)}`;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.text)
      .text(line, {
        lineGap: 1.2,
        width: contentWidth(doc),
      });
    if (item.comments) {
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(COLORS.muted)
        .text(`Comentario: ${sanitizeText(item.comments)}`, {
          lineGap: 1.2,
          width: contentWidth(doc),
        });
    }
  });
}

function addSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 52);
  doc.moveDown(0.25);
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(COLORS.primary)
    .text(title, PAGE.left, doc.y, {
      width: contentWidth(doc),
    });
  doc.moveDown(0.24);
  addThinRule(doc);
  doc.moveDown(0.35);
}

function addInfoGrid(
  doc: PDFKit.PDFDocument,
  rows: Array<[string, string | null | undefined]>,
) {
  const gap = 18;
  const columnWidth = (contentWidth(doc) - gap) / 2;

  for (let index = 0; index < rows.length; index += 2) {
    ensureSpace(doc, 38);
    const y = doc.y;
    addInfoCell(doc, rows[index], PAGE.left, y, columnWidth);

    if (rows[index + 1]) {
      addInfoCell(doc, rows[index + 1], PAGE.left + columnWidth + gap, y, columnWidth);
    }

    doc.y = Math.max(doc.y, y + 34);
    doc.moveDown(0.18);
  }
}

function addInfoCell(
  doc: PDFKit.PDFDocument,
  row: [string, string | null | undefined],
  x: number,
  y: number,
  width: number,
) {
  const [label, value] = row;
  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor(COLORS.muted)
    .text(label.toUpperCase(), x, y, {
      width,
    });
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor(COLORS.text)
    .text(sanitizeText(value), x, y + 12, {
      lineGap: 1.5,
      width,
    });
}

function addKeyValueLine(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string | null | undefined,
  x: number,
  width: number,
) {
  ensureSpace(doc, 22);
  const y = doc.y;
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(COLORS.text)
    .text(`${label}:`, x, y, {
      width: 88,
    });
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLORS.text)
    .text(sanitizeText(value), x + 92, y, {
      lineGap: 1.3,
      width: width - 92,
    });
  doc.y = Math.max(doc.y, y + 14);
}

function addTextBlock(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string | null | undefined,
  x: number,
  width: number,
) {
  ensureSpace(doc, 52);
  doc.moveDown(0.25);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(COLORS.text)
    .text(label, x, doc.y, {
      width,
    });
  doc.moveDown(0.18);
  doc
    .font("Helvetica")
    .fontSize(9.3)
    .fillColor(COLORS.text)
    .text(sanitizeText(value), x, doc.y, {
      lineGap: 2,
      width,
    });
}

function addAttachmentList(
  doc: PDFKit.PDFDocument,
  attachments: AttachmentForPdf[],
  x: number,
  width: number,
) {
  ensureSpace(doc, 38);
  doc.moveDown(0.35);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(COLORS.text)
    .text("Listado de adjuntos", x, doc.y, {
      width,
    });
  doc.moveDown(0.18);

  if (attachments.length === 0) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text("Sin adjuntos", x, doc.y, {
        width,
      });
    return;
  }

  attachments.forEach((attachment) => {
    ensureSpace(doc, 24);
    doc
      .font("Helvetica")
      .fontSize(8.8)
      .fillColor(COLORS.text)
      .text(`- ${formatAttachment(attachment)}`, x, doc.y, {
        lineGap: 1.2,
        width,
      });
  });
}

function addPhotoEvidenceSection(
  doc: PDFKit.PDFDocument,
  evidence: EventPhotoEvidence,
  x: number,
  width: number,
) {
  if (evidence.totalImages === 0) {
    return;
  }

  ensureSpace(doc, 54);
  doc.moveDown(0.45);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(COLORS.text)
    .text("Evidencias fotográficas", x, doc.y, {
      width,
    });
  doc.moveDown(0.25);

  const gap = 12;
  const cellWidth = (width - gap * (PHOTO_COLUMNS - 1)) / PHOTO_COLUMNS;
  const imageHeight = PHOTO_FIT[1];
  const cellHeight = imageHeight + PHOTO_LABEL_HEIGHT + PHOTO_PADDING * 2;

  evidence.photos.forEach((photo, index) => {
    const column = index % PHOTO_COLUMNS;

    if (column === 0) {
      ensureSpace(doc, cellHeight + 8);
    }

    const rowY = doc.y;
    const cellX = x + column * (cellWidth + gap);
    const imageX = cellX + PHOTO_PADDING;
    const imageY = rowY + PHOTO_PADDING;
    const imageWidth = cellWidth - PHOTO_PADDING * 2;

    doc
      .roundedRect(cellX, rowY, cellWidth, cellHeight, 4)
      .strokeColor(COLORS.softBorder)
      .lineWidth(0.6)
      .stroke();

    if (photo.imageBuffer) {
      try {
        doc.image(photo.imageBuffer, imageX, imageY, {
          align: "center",
          fit: [Math.min(PHOTO_FIT[0], imageWidth), imageHeight],
          valign: "center",
        });
      } catch {
        addUnavailableImageText(doc, cellX, rowY, cellWidth, imageHeight);
      }
    } else {
      addUnavailableImageText(doc, cellX, rowY, cellWidth, imageHeight);
    }

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(COLORS.muted)
      .text(
        formatPhotoCaption(photo.attachment),
        cellX + PHOTO_PADDING,
        rowY + imageHeight + PHOTO_PADDING + 4,
        {
          height: PHOTO_LABEL_HEIGHT - 4,
          lineGap: 1,
          width: cellWidth - PHOTO_PADDING * 2,
        },
      );

    if (column === PHOTO_COLUMNS - 1 || index === evidence.photos.length - 1) {
      doc.y = rowY + cellHeight + 6;
    }
  });

  if (evidence.totalImages > MAX_PHOTO_EVIDENCE_PER_EVENT) {
    ensureSpace(doc, 26);
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(COLORS.muted)
      .text(
        `Se muestran ${MAX_PHOTO_EVIDENCE_PER_EVENT} de ${evidence.totalImages} imágenes. Consulte los adjuntos digitales para ver el resto.`,
        x,
        doc.y,
        {
          width,
        },
      );
  }
}

function addUnavailableImageText(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(COLORS.muted)
    .text(
      "Imagen no disponible",
      x + PHOTO_PADDING,
      y + PHOTO_PADDING + height / 2 - 5,
      {
      align: "center",
        width: width - PHOTO_PADDING * 2,
      },
    );
}

function addEmptyState(doc: PDFKit.PDFDocument, value: string) {
  ensureSpace(doc, 58);
  doc
    .roundedRect(PAGE.left, doc.y, contentWidth(doc), 42, 5)
    .fillAndStroke(COLORS.fill, COLORS.softBorder);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLORS.muted)
    .text(sanitizeText(value), PAGE.left + 14, doc.y + 14, {
      width: contentWidth(doc) - 28,
    });
  doc.moveDown(2.2);
}

function addThinRule(doc: PDFKit.PDFDocument) {
  const y = doc.y;
  doc
    .strokeColor(COLORS.softBorder)
    .lineWidth(0.6)
    .moveTo(PAGE.left, y)
    .lineTo(doc.page.width - PAGE.right, y)
    .stroke();
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > doc.page.height - PAGE.bottom) {
    doc.addPage();
    doc.y = PAGE.top;
  }
}

function addFooters(doc: PDFKit.PDFDocument, context: RenderContext) {
  const range = doc.bufferedPageRange();
  const generatedAt = formatDateTime(context.generatedAt);
  const originalPage = range.start + range.count - 1;

  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(range.start + index);
    drawFooterOnCurrentPage(doc, index + 1, range.count, generatedAt);
  }

  doc.switchToPage(originalPage);
}

function drawFooterOnCurrentPage(
  doc: PDFKit.PDFDocument,
  pageNumber: number,
  pageCount: number,
  generatedAt: string,
) {
  const footerY = doc.page.height - 50;
  const previousMargins = { ...doc.page.margins };
  const previousX = doc.x;
  const previousY = doc.y;

  try {
    doc.page.margins = {
      bottom: 0,
      left: 0,
      right: 0,
      top: 0,
    };

    doc
      .strokeColor(COLORS.softBorder)
      .lineWidth(0.6)
      .moveTo(PAGE.left, footerY - 8)
      .lineTo(doc.page.width - PAGE.right, footerY - 8)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(7.8)
      .fillColor(COLORS.muted)
      .text(
        `Documento generado por Bitacora de Obra | Generado: ${generatedAt}`,
        PAGE.left,
        footerY,
        {
          height: 10,
          lineBreak: false,
          width: contentWidth(doc) - 90,
        },
      );

    doc
      .font("Helvetica")
      .fontSize(7.8)
      .fillColor(COLORS.muted)
      .text(`Pagina ${pageNumber} de ${pageCount}`, PAGE.left, footerY, {
        align: "right",
        height: 10,
        lineBreak: false,
        width: contentWidth(doc),
      });

    doc
      .font("Helvetica")
      .fontSize(7.4)
      .fillColor(COLORS.muted)
      .text(
        "Este documento corresponde al registro digital de la bitacora diaria.",
        PAGE.left,
        footerY + 13,
        {
          height: 10,
          lineBreak: false,
          width: contentWidth(doc),
        },
      );
  } finally {
    doc.page.margins = previousMargins;
    doc.x = previousX;
    doc.y = previousY;
  }
}
function contentWidth(doc: PDFKit.PDFDocument) {
  return doc.page.width - PAGE.left - PAGE.right;
}

function formatProjectName(name: string | null, code: string | null) {
  const safeName = sanitizeText(name);
  const safeCode = sanitizeText(code, "");

  if (!safeCode) {
    return safeName;
  }

  return `${safeName} (${safeCode})`;
}

function formatEventType(event: EventForPdf) {
  const code = sanitizeText(event.eventType.code, "");
  const name = sanitizeText(event.eventType.name, "");

  if (code && name) {
    return `${code} - ${name}`;
  }

  return code || name || "Tipo de evento no disponible";
}

function formatAttachment(attachment: AttachmentForPdf) {
  const name = sanitizeText(
    attachment.originalFilename ||
      attachment.originalName ||
      attachment.sanitizedFilename ||
      attachment.filename,
    "Archivo sin nombre",
  );
  const mime = sanitizeText(attachment.mimeType, "");
  const size =
    typeof attachment.sizeBytes === "number"
      ? formatFileSize(attachment.sizeBytes)
      : typeof attachment.size === "number"
        ? formatFileSize(attachment.size)
        : "";
  const details = [mime, size].filter(Boolean).join(", ");

  return details ? `${name} (${details})` : name;
}

function getAttachmentMimeTypeForPdf(attachment: AttachmentForPdf) {
  if (attachment.mimeType) {
    return attachment.mimeType;
  }

  const extension = getAttachmentExtensionForPdf(attachment);

  if (extension === "jpg" || extension === "jpeg") {
    return "image/jpeg";
  }

  if (extension === "png") {
    return "image/png";
  }

  return null;
}

function getAttachmentExtensionForPdf(attachment: AttachmentForPdf) {
  const explicitExtension = attachment.extension?.replace(".", "").toLowerCase();

  if (explicitExtension) {
    return explicitExtension;
  }

  const fileName =
    attachment.originalFilename ||
    attachment.originalName ||
    attachment.sanitizedFilename ||
    attachment.filename ||
    "";
  const extension = fileName.split(".").pop()?.toLowerCase();

  return extension && extension !== fileName.toLowerCase() ? extension : null;
}

function formatPhotoCaption(attachment: AttachmentForPdf) {
  const name = sanitizeText(
    attachment.originalFilename ||
      attachment.originalName ||
      attachment.sanitizedFilename ||
      attachment.filename,
    "Imagen adjunta",
  );
  const size =
    typeof attachment.sizeBytes === "number"
      ? formatFileSize(attachment.sizeBytes)
      : typeof attachment.size === "number"
        ? formatFileSize(attachment.size)
        : "";

  return [name, size].filter(Boolean).join(" | ");
}

function formatPerson(
  value:
    | CurrentUserPayload
    | { email: string | null; fullName: string | null }
    | null
    | undefined,
) {
  if (!value) {
    return "No disponible";
  }

  const name = sanitizeText(value.fullName, "");
  const email = sanitizeText(value.email, "");

  if (name && email) {
    return `${name} <${email}>`;
  }

  return name || email || "No disponible";
}

function formatStatus(value: string | null | undefined) {
  const labels: Record<string, string> = {
    APPROVED: "Aprobada",
    CANCELLED: "Cancelada",
    CLOSED: "Cerrada",
    DRAFT: "Borrador",
    IN_REVIEW: "En revisión",
    REJECTED: "Rechazada",
    VOIDED: "Anulada",
  };

  return value ? labels[value] || value : "No disponible";
}

function shortId(value: string) {
  return value.slice(0, 8);
}

function sanitizeText(
  value: string | number | Date | null | undefined,
  fallback = "No disponible",
) {
  if (value === null || value === undefined) {
    return fallback;
  }

  const raw = value instanceof Date ? value.toISOString() : String(value);
  const normalized = raw
    .normalize("NFC")
    .replace(/\u00a0/g, " ")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .trim();

  return normalized || fallback;
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: Date | null | undefined) {
  if (!value) {
    return "No disponible";
  }

  return sanitizeText(
    new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
      year: "numeric",
    }).format(value),
  );
}

function formatDateTime(value: Date | null | undefined) {
  if (!value) {
    return "No disponible";
  }

  return sanitizeText(
    new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      year: "numeric",
    }).format(value),
  );
}

function formatDateForFileName(value: Date) {
  return value.toISOString().slice(0, 10);
}
