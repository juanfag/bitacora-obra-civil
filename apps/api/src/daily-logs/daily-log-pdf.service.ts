import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, RecordStatus } from "@prisma/client";
import PDFDocument from "pdfkit";
import { CurrentUserPayload } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";

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

@Injectable()
export class DailyLogPdfService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(id: string, generatedBy?: CurrentUserPayload) {
    const dailyLog = await this.prisma.dailyLog.findUnique({
      where: { id },
      include: dailyLogPdfInclude,
    });

    if (!dailyLog) {
      throw new NotFoundException("Daily log not found");
    }

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
    };

    const buffer = await renderPdf(context, (doc) => {
      addHeader(doc, context);
      addGeneralInfoSection(doc, dailyLog);
      addEventsSection(doc, dailyLog.dailyLogEvents);
      addControlSection(doc, dailyLog, context);
      addSignatureSection(doc);
    });

    return {
      buffer,
      fileName: `bitacora-${formatDateForFileName(dailyLog.logDate)}.pdf`,
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

function addEventsSection(doc: PDFKit.PDFDocument, events: EventForPdf[]) {
  addSectionTitle(doc, "Eventos");

  if (events.length === 0) {
    addEmptyState(doc, "No hay eventos registrados para esta bitácora.");
    return;
  }

  events.forEach((event, index) => addEventBlock(doc, event, index));
}

function addEventBlock(
  doc: PDFKit.PDFDocument,
  event: EventForPdf,
  index: number,
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
  doc.x = PAGE.left;
  doc.moveDown(0.7);
}

function addControlSection(
  doc: PDFKit.PDFDocument,
  dailyLog: DailyLogForPdf,
  context: RenderContext,
) {
  addSectionTitle(doc, "Control");
  addInfoGrid(doc, [
    ["Estado actual", formatStatus(dailyLog.status)],
    ["Generado por", context.generatedBy],
    ["Fecha/hora de generación", formatDateTime(context.generatedAt)],
  ]);

  addStatusHistory(doc, dailyLog.statusHistory);
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

function addSignatureSection(doc: PDFKit.PDFDocument) {
  addSectionTitle(doc, "Firmas pendientes");
  addSignatureLine(doc, "Responsable");
  addSignatureLine(doc, "Aprobador");
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

function addSignatureLine(doc: PDFKit.PDFDocument, label: string) {
  ensureSpace(doc, 58);
  doc.moveDown(0.9);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLORS.text)
    .text(`${label}: ______________________________________________`, PAGE.left, doc.y, {
      width: contentWidth(doc),
    });
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

  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(range.start + index);
    const footerY = doc.page.height - 58;

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
        `Documento generado por Bitácora de Obra | Generado: ${generatedAt}`,
        PAGE.left,
        footerY,
        {
          width: contentWidth(doc) - 80,
        },
      );

    doc
      .font("Helvetica")
      .fontSize(7.8)
      .fillColor(COLORS.muted)
      .text(`Página ${index + 1} de ${range.count}`, PAGE.left, footerY, {
        align: "right",
        width: contentWidth(doc),
      });

    doc
      .font("Helvetica")
      .fontSize(7.4)
      .fillColor(COLORS.muted)
      .text(
        "Este documento corresponde al registro digital de la bitácora diaria.",
        PAGE.left,
        footerY + 13,
        {
          width: contentWidth(doc),
        },
      );
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
    .replace(/BitÃ¡cora/g, "Bitácora")
    .replace(/bitÃ¡cora/g, "bitácora")
    .replace(/PÃ¡gina/g, "Página")
    .replace(/UbicaciÃ³n/g, "Ubicación")
    .replace(/creaciÃ³n/g, "creación")
    .replace(/actualizaciÃ³n/g, "actualización")
    .replace(/DescripciÃ³n/g, "Descripción")
    .replace(/ejecuciÃ³n/g, "ejecución")
    .replace(/automÃ¡ticamente/g, "automáticamente")
    .replace(/Ã¡/g, "á")
    .replace(/Ã©/g, "é")
    .replace(/Ã­/g, "í")
    .replace(/Ã³/g, "ó")
    .replace(/Ãº/g, "ú")
    .replace(/Ã±/g, "ñ")
    .replace(/Ã/g, "Á")
    .replace(/Ã‰/g, "É")
    .replace(/Ã/g, "Í")
    .replace(/Ã“/g, "Ó")
    .replace(/Ãš/g, "Ú")
    .replace(/Ã‘/g, "Ñ")
    .replace(/â€“|â€”/g, "-")
    .replace(/â€œ|â€/g, '"')
    .replace(/â€˜|â€™/g, "'")
    .replace(/\u00a0/g, " ")
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
