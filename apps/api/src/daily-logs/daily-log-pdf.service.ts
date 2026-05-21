import { Injectable, NotFoundException } from "@nestjs/common";
import { RecordStatus } from "@prisma/client";
import PDFDocument from "pdfkit";
import { PrismaService } from "../prisma/prisma.service";

type AttachmentForPdf = {
  originalName: string | null;
  mimeType: string | null;
  size: number | null;
};

type EventForPdf = {
  activity: string | null;
  executionDescription: string | null;
  reportedAt: Date | null;
  createdAt: Date;
  eventType: {
    code: string | null;
    name: string | null;
  };
  attachments: AttachmentForPdf[];
};

type RenderContext = {
  generatedAt: Date;
  header: {
    title: string;
    date: string;
    status: string;
    project: string;
  };
};

const COLORS = {
  border: "#d7dee8",
  muted: "#64748b",
  primary: "#0f766e",
  softBorder: "#e2e8f0",
  text: "#17202a",
};

const PAGE = {
  bottom: 68,
  left: 54,
  right: 54,
  top: 58,
};

@Injectable()
export class DailyLogPdfService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(id: string) {
    const dailyLog = await this.prisma.dailyLog.findUnique({
      where: { id },
      include: {
        project: true,
        dailyLogEvents: {
          where: {
            deletedAt: null,
          },
          include: {
            eventType: true,
            attachments: {
              where: {
                status: RecordStatus.ACTIVE,
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
          orderBy: {
            reportedAt: "asc",
          },
        },
      },
    });

    if (!dailyLog) {
      throw new NotFoundException("Daily log not found");
    }

    const projectName = formatProjectName(
      dailyLog.project.name,
      dailyLog.project.code,
    );
    const context: RenderContext = {
      generatedAt: new Date(),
      header: {
        date: formatDate(dailyLog.logDate),
        project: projectName,
        status: sanitizeText(dailyLog.status),
        title: "Bitácora diaria de obra",
      },
    };

    const buffer = await renderPdf(context, (doc) => {
      addHeader(doc, context);

      addSectionTitle(doc, "Resumen de la bitácora");
      addInfoGrid(doc, [
        ["Fecha de bitácora", formatDate(dailyLog.logDate)],
        ["Estado", dailyLog.status],
        ["Proyecto", projectName],
        ["Ubicación", dailyLog.project.location],
        ["ID de bitácora", dailyLog.id],
        ["Fecha de creación", formatDateTime(dailyLog.createdAt)],
        ["Fecha de actualización", formatDateTime(dailyLog.updatedAt)],
      ]);

      addEventsSection(doc, dailyLog.dailyLogEvents);

      addSectionTitle(doc, "Firmas pendientes");
      addSignatureLine(doc, "Responsable");
      addSignatureLine(doc, "Aprobador");
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
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(COLORS.text)
    .text(sanitizeText(context.header.title), PAGE.left, startY, {
      width,
    });

  doc.moveDown(0.35);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLORS.muted)
    .text(
      [
        `Fecha: ${sanitizeText(context.header.date)}`,
        `Estado: ${sanitizeText(context.header.status)}`,
        `Proyecto: ${sanitizeText(context.header.project)}`,
      ].join("  |  "),
      {
        width,
      },
    );

  doc.moveDown(0.9);
  addSeparator(doc);
}

function addSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 54);
  doc.moveDown(0.4);
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(COLORS.primary)
    .text(sanitizeText(title), {
      width: contentWidth(doc),
    });
  doc.moveDown(0.3);
  addThinRule(doc);
  doc.moveDown(0.25);
}

function addInfoGrid(
  doc: PDFKit.PDFDocument,
  rows: Array<[string, string | null | undefined]>,
) {
  const labelWidth = 128;
  const valueWidth = contentWidth(doc) - labelWidth;

  rows.forEach(([label, value]) => {
    ensureSpace(doc, 26);
    const y = doc.y;
    doc
      .font("Helvetica-Bold")
      .fontSize(9.5)
      .fillColor(COLORS.text)
      .text(`${sanitizeText(label)}:`, PAGE.left, y, {
        width: labelWidth,
      });
    doc
      .font("Helvetica")
      .fontSize(9.5)
      .fillColor(COLORS.text)
      .text(sanitizeText(value), PAGE.left + labelWidth, y, {
        lineGap: 1.5,
        width: valueWidth,
      });
    doc.y = Math.max(doc.y, y + 15);
    doc.moveDown(0.15);
  });
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
  ensureSpace(doc, 138);

  const blockTop = doc.y;
  const blockPadding = 12;
  const blockX = PAGE.left;
  const blockWidth = contentWidth(doc);

  doc
    .strokeColor(COLORS.softBorder)
    .lineWidth(0.7)
    .roundedRect(blockX, blockTop, blockWidth, 1, 1)
    .stroke();

  doc.y = blockTop + blockPadding;
  doc.x = blockX + blockPadding;

  const eventType = formatEventType(event);
  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor(COLORS.primary)
    .text(`${index + 1}. ${eventType}`, {
      width: blockWidth - blockPadding * 2,
    });

  doc.moveDown(0.3);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(COLORS.text)
    .text(sanitizeText(event.activity, "Sin actividad registrada"), {
      width: blockWidth - blockPadding * 2,
    });

  doc.moveDown(0.35);
  addInlineMeta(
    doc,
    "Fecha/hora",
    formatDateTime(event.reportedAt ?? event.createdAt),
    blockWidth - blockPadding * 2,
  );

  doc.moveDown(0.4);
  addTextBlock(
    doc,
    "Descripción de ejecución",
    event.executionDescription,
    blockWidth - blockPadding * 2,
  );

  doc.moveDown(0.4);
  addAttachmentList(doc, event.attachments, blockWidth - blockPadding * 2);

  doc.x = PAGE.left;
  doc.moveDown(0.85);
}

function addInlineMeta(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string | null | undefined,
  width: number,
) {
  ensureSpace(doc, 24);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(`${sanitizeText(label)}: `, {
      continued: true,
      width,
    });
  doc.font("Helvetica").fillColor(COLORS.muted).text(sanitizeText(value));
}

function addTextBlock(
  doc: PDFKit.PDFDocument,
  label: string,
  value: string | null | undefined,
  width: number,
) {
  ensureSpace(doc, 44);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(COLORS.text)
    .text(sanitizeText(label), {
      width,
    });
  doc.moveDown(0.15);
  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor(COLORS.text)
    .text(sanitizeText(value), {
      lineGap: 2,
      width,
    });
}

function addAttachmentList(
  doc: PDFKit.PDFDocument,
  attachments: AttachmentForPdf[],
  width: number,
) {
  ensureSpace(doc, 34);
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(COLORS.text)
    .text("Adjuntos", {
      width,
    });
  doc.moveDown(0.18);

  if (attachments.length === 0) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.muted)
      .text("Sin adjuntos", {
        width,
      });
    return;
  }

  attachments.forEach((attachment) => {
    ensureSpace(doc, 22);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.text)
      .text(`- ${formatAttachment(attachment)}`, {
        lineGap: 1,
        width,
      });
  });
}

function addEmptyState(doc: PDFKit.PDFDocument, value: string) {
  ensureSpace(doc, 68);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLORS.muted)
    .text(sanitizeText(value), {
      lineGap: 2,
      width: contentWidth(doc),
    });
  doc.moveDown(0.6);
}

function addSignatureLine(doc: PDFKit.PDFDocument, label: string) {
  ensureSpace(doc, 58);
  doc.moveDown(1);
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(COLORS.text)
    .text(`${sanitizeText(label)}: ______________________________________________`, {
      width: contentWidth(doc),
    });
}

function addSeparator(doc: PDFKit.PDFDocument) {
  const y = doc.y;
  doc
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .moveTo(PAGE.left, y)
    .lineTo(doc.page.width - PAGE.right, y)
    .stroke();
  doc.moveDown(0.8);
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
  const footerText = `Documento generado automáticamente por Bitácora de Obra | Generado: ${generatedAt}`;

  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(range.start + index);
    const footerY = doc.page.height - 50;

    doc
      .strokeColor(COLORS.softBorder)
      .lineWidth(0.6)
      .moveTo(PAGE.left, footerY - 8)
      .lineTo(doc.page.width - PAGE.right, footerY - 8)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(sanitizeText(footerText), PAGE.left, footerY, {
        width: contentWidth(doc) - 80,
      });

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(`Página ${index + 1} de ${range.count}`, PAGE.left, footerY, {
        align: "right",
        width: contentWidth(doc),
      });
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
  const name = sanitizeText(attachment.originalName, "Archivo sin nombre");
  const mime = sanitizeText(attachment.mimeType, "");
  const size =
    typeof attachment.size === "number" ? formatFileSize(attachment.size) : "";
  const details = [mime, size].filter(Boolean).join(", ");

  return details ? `${name} (${details})` : name;
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
    .replace(/Â¿/g, "¿")
    .replace(/Â¡/g, "¡")
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
    .replace(/â|â|–|—/g, "-")
    .replace(/â|â|“|”/g, '"')
    .replace(/â|â|‘|’/g, "'")
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

function formatDate(value: Date) {
  return sanitizeText(
    new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
      year: "numeric",
    }).format(value),
  );
}

function formatDateTime(value: Date) {
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
