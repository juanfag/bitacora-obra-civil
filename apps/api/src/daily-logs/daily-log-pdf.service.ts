import { Injectable, NotFoundException } from "@nestjs/common";
import { RecordStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type PdfLine = {
  size?: number;
  text: string;
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

    return createPdf([
      { text: "Bitácora diaria de obra", size: 18 },
      { text: "" },
      { text: `Fecha de bitácora: ${formatDate(dailyLog.logDate)}` },
      { text: `Estado: ${dailyLog.status}` },
      { text: `Proyecto: ${dailyLog.project.name} (${dailyLog.project.code})` },
      { text: `Ubicación: ${dailyLog.project.location ?? "No disponible"}` },
      { text: `ID de bitácora: ${dailyLog.id}` },
      { text: `Creada: ${formatDateTime(dailyLog.createdAt)}` },
      { text: `Actualizada: ${formatDateTime(dailyLog.updatedAt)}` },
      { text: "" },
      { text: "Eventos", size: 14 },
      ...this.getEventLines(dailyLog.dailyLogEvents),
      { text: "" },
      { text: "Firmas pendientes", size: 14 },
      { text: "Responsable: ________________________________" },
      { text: "Aprobador: _________________________________" },
    ]);
  }

  private getEventLines(
    events: Array<{
      activity: string;
      executionDescription: string;
      reportedAt: Date;
      createdAt: Date;
      eventType: {
        code: string;
        name: string;
      };
      attachments: Array<{
        originalName: string;
        mimeType: string;
        size: number;
      }>;
    }>,
  ) {
    if (events.length === 0) {
      return [{ text: "No hay eventos registrados para esta bitácora." }];
    }

    return events.flatMap((event, index) => [
      { text: "" },
      { text: `${index + 1}. ${event.activity}`, size: 12 },
      { text: `Tipo de evento: ${event.eventType.code} - ${event.eventType.name}` },
      {
        text: `Fecha/hora: ${formatDateTime(event.reportedAt ?? event.createdAt)}`,
      },
      { text: `Descripción: ${event.executionDescription}` },
      {
        text:
          event.attachments.length > 0
            ? `Adjuntos (${event.attachments.length}): ${event.attachments
                .map((attachment) => attachment.originalName)
                .join(", ")}`
            : "Adjuntos: 0",
      },
    ]);
  }
}

function createPdf(lines: PdfLine[]) {
  const pages = paginateLines(lines);
  const objects: string[] = [];
  const catalogObjectId = 1;
  const pagesObjectId = 2;
  const fontObjectId = 3;
  const firstPageObjectId = 4;

  objects[catalogObjectId] = `<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>`;
  objects[fontObjectId] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";

  pages.forEach((pageLines, pageIndex) => {
    const pageObjectId = firstPageObjectId + pageIndex * 2;
    const contentObjectId = pageObjectId + 1;
    const content = createPageContent(pageLines);

    objects[pageObjectId] =
      `<< /Type /Page /Parent ${pagesObjectId} 0 R /MediaBox [0 0 612 792] ` +
      `/Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId] =
      `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`;
  });

  const kids = pages
    .map((_, pageIndex) => `${firstPageObjectId + pageIndex * 2} 0 R`)
    .join(" ");
  objects[pagesObjectId] = `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`;

  return serializePdf(objects);
}

function paginateLines(lines: PdfLine[]) {
  const pages: PdfLine[][] = [[]];
  let y = 740;

  for (const line of lines.flatMap(wrapLine)) {
    const size = line.size ?? 10;
    const lineHeight = size + 6;

    if (y - lineHeight < 56) {
      pages.push([]);
      y = 740;
    }

    pages[pages.length - 1].push(line);
    y -= lineHeight;
  }

  return pages;
}

function wrapLine(line: PdfLine) {
  const maxLength = line.size && line.size > 12 ? 64 : 92;
  const text = line.text || " ";

  if (text.length <= maxLength) {
    return [line];
  }

  const wrapped: PdfLine[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    const breakAt = remaining.lastIndexOf(" ", maxLength);
    const index = breakAt > 20 ? breakAt : maxLength;
    wrapped.push({ ...line, text: remaining.slice(0, index) });
    remaining = remaining.slice(index).trim();
  }

  if (remaining) {
    wrapped.push({ ...line, text: remaining });
  }

  return wrapped;
}

function createPageContent(lines: PdfLine[]) {
  const commands = ["BT", "/F1 10 Tf", "50 740 Td"];
  let previousSize = 10;

  lines.forEach((line, index) => {
    const size = line.size ?? 10;
    const lineHeight = index === 0 ? 0 : size + 6;

    if (size !== previousSize) {
      commands.push(`/F1 ${size} Tf`);
      previousSize = size;
    }

    if (lineHeight > 0) {
      commands.push(`0 -${lineHeight} Td`);
    }

    commands.push(`${toPdfText(line.text || " ")} Tj`);
  });

  commands.push("ET");

  return commands.join("\n");
}

function serializePdf(objects: string[]) {
  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];

  for (let objectId = 1; objectId < objects.length; objectId += 1) {
    offsets[objectId] = Buffer.byteLength(chunks.join(""), "latin1");
    chunks.push(`${objectId} 0 obj\n${objects[objectId]}\nendobj\n`);
  }

  const xrefOffset = Buffer.byteLength(chunks.join(""), "latin1");
  chunks.push(`xref\n0 ${objects.length}\n`);
  chunks.push("0000000000 65535 f \n");

  for (let objectId = 1; objectId < objects.length; objectId += 1) {
    chunks.push(`${String(offsets[objectId]).padStart(10, "0")} 00000 n \n`);
  }

  chunks.push(
    `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  return Buffer.from(chunks.join(""), "latin1");
}

function toPdfText(value: string) {
  const sanitized = value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^\u0009\u000a\u000d\u0020-\u00ff]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

  return `(${sanitized})`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}
