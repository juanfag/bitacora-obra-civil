import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, stat, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, resolve, sep } from "node:path";
import {
  Document,
  DocumentStatus,
  DocumentType,
  Prisma,
} from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { AuditRequestContext } from "../audit/audit.types";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectAccessPolicy } from "../projects/project-access.policy";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { FindDocumentsQueryDto } from "./dto/find-documents-query.dto";
import { UpdateDocumentDto } from "./dto/update-document.dto";
import { UploadDocumentDto } from "./dto/upload-document.dto";

type UploadedDocumentFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const MAX_DOCUMENT_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const DOCUMENT_STORAGE_ROOT = "storage";
const DOCUMENT_STORAGE_FOLDER = "documents";
const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const ALLOWED_EXTENSIONS_BY_MIME_TYPE: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    "docx",
  ],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly projectAccessPolicy: ProjectAccessPolicy,
  ) {}

  async create(createDocumentDto: CreateDocumentDto, audit: AuditRequestContext) {
    const context = await this.resolveDocumentContext(createDocumentDto);
    await this.ensureUserCanAccessProject(audit.actorId, context.project.id);
    const documentTypeCatalog = await this.ensureDocumentTypeCatalog(
      createDocumentDto.type,
    );

    try {
      const document = await this.prisma.document.create({
        data: {
          organizationId: context.project.organizationId,
          projectId: context.project.id,
          dailyLogId: createDocumentDto.dailyLogId,
          eventId: createDocumentDto.eventId,
          documentTypeId: documentTypeCatalog.id,
          uploadedById: audit.actorId,
          type: createDocumentDto.type,
          title: createDocumentDto.title,
          description: createDocumentDto.description,
          fileName: sanitizeFileName(createDocumentDto.fileName),
          storagePath: buildPendingStoragePath(createDocumentDto.fileName),
          mimeType: createDocumentDto.mimeType,
          sizeBytes: BigInt(createDocumentDto.sizeBytes),
          checksumSha256: createDocumentDto.checksumSha256.toLowerCase(),
          metadata: toJson(createDocumentDto.metadata),
        },
        include: documentResponseInclude,
      });

      await this.auditService.record({
        ...audit,
        action: "CREATE_DOCUMENT",
        entity: "Document",
        entityId: document.id,
        newValue: this.toAuditValue(document),
      });

      return toDocumentResponse(document);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async upload(
    uploadDocumentDto: UploadDocumentDto,
    file: UploadedDocumentFile | undefined,
    audit: AuditRequestContext,
  ) {
    const parsedMetadata = parseMetadata(uploadDocumentDto.metadata);
    const safeFile = validateDocumentFile(file);
    const checksumSha256 = createHash("sha256")
      .update(safeFile.buffer)
      .digest("hex");
    const context = await this.resolveDocumentContext(uploadDocumentDto);
    await this.ensureUserCanAccessProject(audit.actorId, context.project.id);
    const documentTypeCatalog = await this.ensureDocumentTypeCatalog(
      uploadDocumentDto.type,
    );
    const storagePath = buildDocumentStoragePath(
      context.project.id,
      safeFile.fileName,
    );
    const absoluteStoragePath = join(process.cwd(), storagePath);

    await mkdir(dirname(absoluteStoragePath), { recursive: true });
    await writeFile(absoluteStoragePath, safeFile.buffer, { flag: "wx" });

    try {
      const document = await this.prisma.document.create({
        data: {
          organizationId: context.project.organizationId,
          projectId: context.project.id,
          dailyLogId: uploadDocumentDto.dailyLogId,
          eventId: uploadDocumentDto.eventId,
          documentTypeId: documentTypeCatalog.id,
          uploadedById: audit.actorId,
          type: uploadDocumentDto.type,
          title: uploadDocumentDto.title,
          description: uploadDocumentDto.description,
          fileName: safeFile.fileName,
          storagePath,
          mimeType: safeFile.mimeType,
          sizeBytes: BigInt(safeFile.size),
          checksumSha256,
          metadata: toJson(parsedMetadata),
        },
        include: documentResponseInclude,
      });

      const auditValue = this.toAuditValue(document);

      await this.auditService.record({
        ...audit,
        action: "CREATE_DOCUMENT",
        entity: "Document",
        entityId: document.id,
        newValue: auditValue,
      });

      await this.auditService.record({
        ...audit,
        action: "UPLOAD_DOCUMENT",
        entity: "Document",
        entityId: document.id,
        newValue: {
          ...auditValue,
          uploaded: true,
        },
      });

      return toDocumentResponse(document);
    } catch (error) {
      await safeUnlink(absoluteStoragePath);
      this.handlePrismaError(error);
    }
  }

  async findAll(query: FindDocumentsQueryDto, currentUserId: string) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const accessibleProjectIds =
      await this.projectAccessPolicy.getAccessibleProjectIds(currentUserId);

    if (query.projectId) {
      await this.ensureUserCanAccessProject(currentUserId, query.projectId);
    }

    if (accessibleProjectIds && accessibleProjectIds.length === 0) {
      return {
        items: [],
        meta: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const where = this.buildWhere(query, accessibleProjectIds);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        include: documentResponseInclude,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      items: items.map(toDocumentResponse),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, currentUserId: string) {
    const document = await this.findDocumentOrThrow(id);
    await this.ensureUserCanAccessProject(currentUserId, document.projectId);

    return toDocumentResponse(document);
  }

  async getDownload(id: string, audit: AuditRequestContext) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        status: {
          not: DocumentStatus.DELETED,
        },
      },
      include: documentResponseInclude,
    });

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    await this.ensureUserCanAccessProject(audit.actorId, document.projectId);

    const filePath = resolveDocumentStoragePath(document.storagePath);

    let fileStat: Awaited<ReturnType<typeof stat>>;

    try {
      await access(filePath, constants.R_OK);
      fileStat = await stat(filePath);
    } catch {
      throw new NotFoundException("Document file not found");
    }

    const auditValue = this.toAuditValue(document);

    await this.auditService.record({
      ...audit,
      action: "DOWNLOAD_DOCUMENT",
      entity: "Document",
      entityId: document.id,
      newValue: {
        ...auditValue,
        downloaded: true,
      },
    });

    return {
      fileName: sanitizeFileName(document.fileName),
      filePath,
      mimeType: document.mimeType || "application/octet-stream",
      size: fileStat.size,
    };
  }

  async update(
    id: string,
    updateDocumentDto: UpdateDocumentDto,
    audit: AuditRequestContext,
  ) {
    const currentDocument = await this.findDocumentOrThrow(id);
    await this.ensureUserCanAccessProject(audit.actorId, currentDocument.projectId);

    const nextProjectId = updateDocumentDto.projectId ?? currentDocument.projectId;
    const nextDailyLogId =
      updateDocumentDto.dailyLogId ?? currentDocument.dailyLogId ?? undefined;
    const nextEventId =
      updateDocumentDto.eventId ?? currentDocument.eventId ?? undefined;
    const context = await this.resolveDocumentContext({
      projectId: nextProjectId,
      dailyLogId: nextDailyLogId,
      eventId: nextEventId,
    });
    await this.ensureUserCanAccessProject(audit.actorId, context.project.id);

    const documentTypeCatalog = updateDocumentDto.type
      ? await this.ensureDocumentTypeCatalog(updateDocumentDto.type)
      : undefined;

    try {
      const document = await this.prisma.document.update({
        where: { id },
        data: {
          organizationId: context.project.organizationId,
          projectId: updateDocumentDto.projectId,
          dailyLogId: updateDocumentDto.dailyLogId,
          eventId: updateDocumentDto.eventId,
          documentTypeId: documentTypeCatalog?.id,
          type: updateDocumentDto.type,
          title: updateDocumentDto.title,
          description: updateDocumentDto.description,
          fileName: updateDocumentDto.fileName
            ? sanitizeFileName(updateDocumentDto.fileName)
            : undefined,
          mimeType: updateDocumentDto.mimeType,
          sizeBytes:
            updateDocumentDto.sizeBytes === undefined
              ? undefined
              : BigInt(updateDocumentDto.sizeBytes),
          checksumSha256: updateDocumentDto.checksumSha256?.toLowerCase(),
          status: updateDocumentDto.status,
          deletedAt:
            updateDocumentDto.status === DocumentStatus.DELETED
              ? new Date()
              : updateDocumentDto.status === undefined
                ? undefined
                : null,
          metadata:
            updateDocumentDto.metadata === undefined
              ? undefined
              : toJson(updateDocumentDto.metadata),
        },
        include: documentResponseInclude,
      });

      await this.auditService.record({
        ...audit,
        action: "UPDATE_DOCUMENT",
        entity: "Document",
        entityId: document.id,
        oldValue: this.toAuditValue(currentDocument),
        newValue: this.toAuditValue(document),
      });

      return toDocumentResponse(document);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: string, audit: AuditRequestContext) {
    const currentDocument = await this.findDocumentOrThrow(id);
    await this.ensureUserCanAccessProject(audit.actorId, currentDocument.projectId);

    const document = await this.prisma.document.update({
      where: { id },
      data: {
        status: DocumentStatus.DELETED,
        deletedAt: new Date(),
      },
      include: documentResponseInclude,
    });

    await this.auditService.record({
      ...audit,
      action: "DELETE_DOCUMENT",
      entity: "Document",
      entityId: document.id,
      oldValue: this.toAuditValue(currentDocument),
      newValue: this.toAuditValue(document),
    });

    return toDocumentResponse(document);
  }

  private buildWhere(
    query: FindDocumentsQueryDto,
    accessibleProjectIds: string[] | null,
  ): Prisma.DocumentWhereInput {
    return {
      projectId: query.projectId
        ? query.projectId
        : accessibleProjectIds
          ? {
              in: accessibleProjectIds,
            }
          : undefined,
      dailyLogId: query.dailyLogId,
      eventId: query.eventId,
      type: query.type,
      status: query.status ?? DocumentStatus.ACTIVE,
    };
  }

  private async resolveDocumentContext(input: {
    projectId: string;
    dailyLogId?: string;
    eventId?: string;
  }) {
    const project = await this.prisma.project.findUnique({
      where: { id: input.projectId },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!project) {
      throw new BadRequestException("Invalid projectId reference");
    }

    const dailyLog = input.dailyLogId
      ? await this.prisma.dailyLog.findUnique({
          where: { id: input.dailyLogId },
          select: {
            id: true,
            projectId: true,
          },
        })
      : null;

    if (input.dailyLogId && !dailyLog) {
      throw new BadRequestException("Invalid dailyLogId reference");
    }

    if (dailyLog && dailyLog.projectId !== project.id) {
      throw new BadRequestException(
        "dailyLogId must belong to the same project as the document.",
      );
    }

    const event = input.eventId
      ? await this.prisma.event.findUnique({
          where: { id: input.eventId },
          select: {
            id: true,
            dailyLogId: true,
            projectId: true,
          },
        })
      : null;

    if (input.eventId && !event) {
      throw new BadRequestException("Invalid eventId reference");
    }

    if (event && event.projectId !== project.id) {
      throw new BadRequestException(
        "eventId must belong to the same project as the document.",
      );
    }

    if (event && dailyLog && event.dailyLogId !== dailyLog.id) {
      throw new BadRequestException(
        "eventId must belong to the same dailyLogId as the document.",
      );
    }

    return {
      project,
      dailyLog,
      event,
    };
  }

  private async ensureDocumentTypeCatalog(type: DocumentType) {
    const code = toDocumentTypeCatalogCode(type);

    return this.prisma.documentTypeCatalog.upsert({
      where: { code },
      update: {
        name: toDisplayName(type),
      },
      create: {
        code,
        name: toDisplayName(type),
      },
    });
  }

  private async findDocumentOrThrow(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: documentResponseInclude,
    });

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    return document;
  }

  private async ensureUserCanAccessProject(userId: string, projectId: string) {
    const canAccessProject = await this.projectAccessPolicy.canAccessProject(
      userId,
      projectId,
    );

    if (!canAccessProject) {
      throw new ForbiddenException("User does not have access to this project.");
    }
  }

  private toAuditValue(document: Document) {
    return {
      id: document.id,
      organizationId: document.organizationId,
      projectId: document.projectId,
      dailyLogId: document.dailyLogId,
      eventId: document.eventId,
      type: document.type,
      title: document.title,
      fileName: document.fileName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes ? Number(document.sizeBytes) : null,
      status: document.status,
      uploadedById: document.uploadedById,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      deletedAt: document.deletedAt,
    };
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        throw new BadRequestException("Invalid document reference");
      }

      if (error.code === "P2025") {
        throw new NotFoundException("Document not found");
      }
    }

    throw error;
  }
}

const documentResponseInclude = {
  uploadedBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} satisfies Prisma.DocumentInclude;

type DocumentWithUploader = Prisma.DocumentGetPayload<{
  include: typeof documentResponseInclude;
}>;

function toDocumentResponse(document: DocumentWithUploader) {
  return {
    id: document.id,
    organizationId: document.organizationId,
    projectId: document.projectId,
    dailyLogId: document.dailyLogId,
    eventId: document.eventId,
    type: document.type,
    title: document.title,
    description: document.description,
    fileName: document.fileName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes ? Number(document.sizeBytes) : null,
    status: document.status,
    metadata: document.metadata,
    uploadedById: document.uploadedById,
    uploadedBy: document.uploadedBy
      ? {
          id: document.uploadedBy.id,
          fullName: document.uploadedBy.fullName,
          email: document.uploadedBy.email,
        }
      : null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    deletedAt: document.deletedAt,
  };
}

function sanitizeFileName(fileName: string) {
  return (
    fileName
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/[\r\n\t]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 250) || "documento"
  );
}

function buildPendingStoragePath(fileName: string) {
  return `document-control/pending/${randomUUID()}-${sanitizeFileName(fileName)}`;
}

function buildDocumentStoragePath(projectId: string, fileName: string) {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return join(
    DOCUMENT_STORAGE_ROOT,
    DOCUMENT_STORAGE_FOLDER,
    projectId,
    year,
    month,
    `${randomUUID()}-${fileName}`,
  );
}

function resolveDocumentStoragePath(storagePath: string) {
  const storageRoot = resolve(
    process.cwd(),
    DOCUMENT_STORAGE_ROOT,
    DOCUMENT_STORAGE_FOLDER,
  );
  const resolvedPath = resolve(process.cwd(), storagePath);
  const normalizedRoot = storageRoot.endsWith(sep)
    ? storageRoot
    : `${storageRoot}${sep}`;

  if (resolvedPath !== storageRoot && !resolvedPath.startsWith(normalizedRoot)) {
    throw new ForbiddenException("Invalid document storage path.");
  }

  return resolvedPath;
}

function toJson(value: Record<string, unknown> | undefined) {
  return value === undefined ? undefined : (value as Prisma.InputJsonObject);
}

function toDisplayName(type: DocumentType) {
  return type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function toDocumentTypeCatalogCode(type: DocumentType) {
  const legacyMap: Record<DocumentType, string> = {
    PLANO: "PLAN",
    SOLICITUD_SUSPENSION: "SUSPENSION_REQUEST",
    DENUNCIA: "COMPLAINT",
    DEMANDA: "LEGAL_CLAIM",
    ACTA: "ACT",
    SOPORTE_FOTOGRAFICO: "PHOTO",
    CONTRATO: "CONTRACT",
    OTRO: "OTHER",
  };

  return legacyMap[type];
}

function parseMetadata(value: string | undefined) {
  if (!value?.trim()) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new BadRequestException("metadata must be a JSON object.");
    }

    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    throw new BadRequestException("metadata must be valid JSON.");
  }
}

function validateDocumentFile(file: UploadedDocumentFile | undefined) {
  if (!file) {
    throw new BadRequestException("File is required.");
  }

  if (!file.buffer?.length) {
    throw new BadRequestException("File is required.");
  }

  if (file.size > MAX_DOCUMENT_UPLOAD_SIZE_BYTES) {
    throw new BadRequestException("File exceeds the maximum allowed size.");
  }

  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.mimetype)) {
    throw new BadRequestException("File type is not allowed.");
  }

  const fileName = sanitizeFileName(basename(file.originalname));
  const extension = extname(fileName).replace(".", "").toLowerCase();
  const nameParts = fileName.toLowerCase().split(".").filter(Boolean);
  const allowedExtensions = ALLOWED_EXTENSIONS_BY_MIME_TYPE[file.mimetype] ?? [];

  if (!extension || !allowedExtensions.includes(extension)) {
    throw new BadRequestException(
      "File extension does not match the declared MIME type.",
    );
  }

  if (nameParts.some((part) => DANGEROUS_EXTENSIONS.has(part))) {
    throw new BadRequestException("File extension is not allowed.");
  }

  if (!matchesDocumentMagicBytes(file.mimetype, file.buffer)) {
    throw new BadRequestException(
      "File content does not match the declared MIME type.",
    );
  }

  return {
    buffer: file.buffer,
    fileName,
    mimeType: file.mimetype,
    size: file.size,
  };
}

const DANGEROUS_EXTENSIONS = new Set([
  "bat",
  "cmd",
  "com",
  "exe",
  "js",
  "msi",
  "ps1",
  "scr",
  "sh",
  "vbs",
]);

function matchesDocumentMagicBytes(mimeType: string, buffer: Buffer) {
  const header = buffer.subarray(0, 12);

  if (mimeType === "image/jpeg") {
    return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }

  if (mimeType === "image/png") {
    return header
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (mimeType === "image/webp") {
    return (
      header.subarray(0, 4).toString("ascii") === "RIFF" &&
      header.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }

  if (mimeType === "application/pdf") {
    return header.subarray(0, 5).toString("ascii") === "%PDF-";
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return header[0] === 0x50 && header[1] === 0x4b;
  }

  return false;
}

async function safeUnlink(filePath: string) {
  try {
    await unlink(filePath);
  } catch {
    return;
  }
}
