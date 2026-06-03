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
  DocumentRelationType,
  DocumentStatus,
  DocumentType,
  Prisma,
} from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { AuditRequestContext } from "../audit/audit.types";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectAccessPolicy } from "../projects/project-access.policy";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { CreateDocumentRelationDto } from "./dto/create-document-relation.dto";
import { FindDocumentsQueryDto } from "./dto/find-documents-query.dto";
import { UpdateDocumentDto } from "./dto/update-document.dto";
import { UploadDocumentDto } from "./dto/upload-document.dto";

type UploadedDocumentFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

type StoredDocumentFile = {
  absoluteStoragePath: string;
  checksumSha256: string;
  extension: string;
  fileName: string;
  originalFileName: string;
  size: number;
  storagePath: string;
  mimeType: string;
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
    await this.ensureDocumentCategory(
      createDocumentDto.categoryId,
      context.project.organizationId,
      context.project.id,
    );
    const documentTypeCatalog = await this.ensureDocumentTypeCatalog(
      createDocumentDto.type,
    );
    const fileName = createDocumentDto.fileName
      ? sanitizeFileName(createDocumentDto.fileName)
      : buildMetadataOnlyFileName(createDocumentDto.title);

    try {
      const document = await this.prisma.document.create({
        data: {
          organizationId: context.project.organizationId,
          projectId: context.project.id,
          dailyLogId: createDocumentDto.dailyLogId,
          eventId: createDocumentDto.eventId,
          documentTypeId: documentTypeCatalog.id,
          categoryId: createDocumentDto.categoryId,
          uploadedById: audit.actorId,
          createdById: audit.actorId,
          code: createDocumentDto.code,
          type: createDocumentDto.type,
          title: createDocumentDto.title,
          description: createDocumentDto.description,
          fileName,
          storagePath: buildPendingStoragePath(fileName),
          mimeType: createDocumentDto.mimeType,
          sizeBytes:
            createDocumentDto.sizeBytes === undefined
              ? undefined
              : BigInt(createDocumentDto.sizeBytes),
          checksumSha256: createDocumentDto.checksumSha256?.toLowerCase(),
          status: createDocumentDto.status,
          visibility: createDocumentDto.visibility,
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
    const context = uploadDocumentDto.documentId
      ? await this.resolveExistingDocumentUploadContext(
          uploadDocumentDto.documentId,
          audit.actorId,
        )
      : await this.resolveDocumentContext(uploadDocumentDto);
    await this.ensureUserCanAccessProject(audit.actorId, context.project.id);
    const storedFile = await this.storeDocumentFile(
      context.project.id,
      safeFile,
    );

    const documentTypeCatalog = uploadDocumentDto.documentId
      ? null
      : await this.ensureDocumentTypeCatalog(uploadDocumentDto.type);

    try {
      const { document, version } = await this.prisma.$transaction(async (tx) => {
        const document = uploadDocumentDto.documentId
          ? await tx.document.update({
              where: {
                id: uploadDocumentDto.documentId,
              },
              data: {
                updatedById: audit.actorId,
                fileName: storedFile.fileName,
                storagePath: storedFile.storagePath,
                mimeType: storedFile.mimeType,
                sizeBytes: BigInt(storedFile.size),
                checksumSha256: storedFile.checksumSha256,
                metadata:
                  parsedMetadata === undefined
                    ? undefined
                    : toJson(parsedMetadata),
              },
              include: documentResponseInclude,
            })
          : await tx.document.create({
              data: {
                organizationId: context.project.organizationId,
                projectId: context.project.id,
                dailyLogId: uploadDocumentDto.dailyLogId,
                eventId: uploadDocumentDto.eventId,
                documentTypeId: documentTypeCatalog!.id,
                uploadedById: audit.actorId,
                createdById: audit.actorId,
                type: uploadDocumentDto.type,
                title: uploadDocumentDto.title,
                description: uploadDocumentDto.description,
                fileName: storedFile.fileName,
                storagePath: storedFile.storagePath,
                mimeType: storedFile.mimeType,
                sizeBytes: BigInt(storedFile.size),
                checksumSha256: storedFile.checksumSha256,
                metadata: toJson(parsedMetadata),
              },
              include: documentResponseInclude,
            });

        const lastVersion = await tx.documentVersion.findFirst({
          where: {
            documentId: document.id,
          },
          orderBy: {
            versionNumber: "desc",
          },
          select: {
            versionNumber: true,
          },
        });
        const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

        await tx.documentVersion.updateMany({
          where: {
            documentId: document.id,
            isCurrentVersion: true,
          },
          data: {
            isCurrentVersion: false,
          },
        });

        const version = await tx.documentVersion.create({
          data: {
            documentId: document.id,
            versionNumber: nextVersionNumber,
            fileName: storedFile.fileName,
            originalName: storedFile.originalFileName,
            originalFileName: storedFile.originalFileName,
            mimeType: storedFile.mimeType,
            extension: storedFile.extension,
            sizeBytes: BigInt(storedFile.size),
            checksumSha256: storedFile.checksumSha256,
            storageProvider: "LOCAL",
            storageKey: storedFile.storagePath,
            storagePath: storedFile.storagePath,
            isCurrentVersion: true,
            uploadedById: audit.actorId,
            metadata: toJson(parsedMetadata),
          },
        });

        const updatedDocument = await tx.document.update({
          where: {
            id: document.id,
          },
          data: {
            currentVersionId: version.id,
            version: nextVersionNumber,
          },
          include: documentResponseInclude,
        });

        return { document: updatedDocument, version };
      });

      const auditValue = this.toAuditValue(document);
      const versionAuditValue = this.toDocumentVersionAuditValue(version);

      await this.auditService.record({
        ...audit,
        action: uploadDocumentDto.documentId ? "UPDATE_DOCUMENT" : "DOCUMENT_CREATED",
        entity: "Document",
        entityId: document.id,
        newValue: auditValue,
      });

      await this.auditService.record({
        ...audit,
        action: "DOCUMENT_VERSION_CREATED",
        entity: "DocumentVersion",
        entityId: version.id,
        newValue: {
          ...versionAuditValue,
          documentId: document.id,
        },
      });

      return toDocumentResponse(document);
    } catch (error) {
      await safeUnlink(storedFile.absoluteStoragePath);
      this.handlePrismaError(error);
    }
  }

  async findVersions(documentId: string, currentUserId: string) {
    const document = await this.findDocumentOrThrow(documentId);
    await this.ensureUserCanAccessProject(currentUserId, document.projectId);

    const versions = await this.prisma.documentVersion.findMany({
      where: {
        documentId,
        deletedAt: null,
      },
      orderBy: {
        versionNumber: "desc",
      },
      select: documentVersionResponseSelect,
    });

    return versions.map(toDocumentVersionResponse);
  }

  async createRelation(
    documentId: string,
    dto: CreateDocumentRelationDto,
    audit: AuditRequestContext,
  ) {
    const document = await this.findDocumentOrThrow(documentId);

    if (document.status === DocumentStatus.DELETED || document.deletedAt) {
      throw new NotFoundException("Document not found");
    }

    await this.ensureUserCanAccessProject(audit.actorId, document.projectId);

    const target = await this.resolveRelationTarget(dto, audit.actorId);

    if (target.projectId !== document.projectId) {
      throw new BadRequestException(
        "Document and relation target must belong to the same project.",
      );
    }

    const duplicate = await this.prisma.documentRelation.findFirst({
      where: {
        documentId,
        relationType: dto.relationType,
        dailyLogId: target.dailyLogId,
        dailyLogEventId: target.dailyLogEventId,
        projectId: target.projectId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (duplicate) {
      throw new BadRequestException("Document relation already exists.");
    }

    const relation = await this.prisma.documentRelation.create({
      data: {
        documentId,
        relationType: dto.relationType,
        organizationId: document.organizationId,
        projectId: target.projectId,
        dailyLogId: target.dailyLogId,
        dailyLogEventId: target.dailyLogEventId,
        metadata: dto.metadata
          ? (dto.metadata as Prisma.InputJsonValue)
          : undefined,
        createdById: audit.actorId,
      },
      include: documentRelationResponseInclude,
    });

    await this.auditService.record({
      ...audit,
      action: "DOCUMENT_RELATION_CREATED",
      entity: "DocumentRelation",
      entityId: relation.id,
      newValue: toDocumentRelationAuditValue(relation),
    });

    return toDocumentRelationResponse(relation);
  }

  async findRelations(documentId: string, currentUserId: string) {
    const document = await this.findDocumentOrThrow(documentId);
    await this.ensureUserCanAccessProject(currentUserId, document.projectId);

    const relations = await this.prisma.documentRelation.findMany({
      where: {
        documentId,
        deletedAt: null,
      },
      include: documentRelationResponseInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    return relations.map(toDocumentRelationResponse);
  }

  async getAudit(documentId: string, currentUserId: string) {
    const document = await this.findDocumentOrThrow(documentId);
    await this.ensureUserCanAccessProject(currentUserId, document.projectId);

    const [versions, relations] = await Promise.all([
      this.prisma.documentVersion.findMany({
        where: {
          documentId,
        },
        select: {
          id: true,
        },
      }),
      this.prisma.documentRelation.findMany({
        where: {
          documentId,
        },
        select: {
          id: true,
        },
      }),
    ]);
    const versionIds = versions.map((version) => version.id);
    const relationIds = relations.map((relation) => relation.id);

    const items = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          {
            entityName: "Document",
            entityId: documentId,
          },
          ...(versionIds.length
            ? [
                {
                  entityName: "DocumentVersion",
                  entityId: {
                    in: versionIds,
                  },
                },
              ]
            : []),
          ...(relationIds.length
            ? [
                {
                  entityName: "DocumentRelation",
                  entityId: {
                    in: relationIds,
                  },
                },
              ]
            : []),
        ],
        action: {
          in: [
            "CREATE_DOCUMENT",
            "UPDATE_DOCUMENT",
            "DELETE_DOCUMENT",
            "DOWNLOAD_DOCUMENT",
            "DOCUMENT_CREATED",
            "DOCUMENT_VERSION_CREATED",
            "DOCUMENT_DOWNLOADED",
            "DOCUMENT_RELATION_CREATED",
            "DOCUMENT_RELATION_DELETED",
          ],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        action: true,
        createdAt: true,
        entityId: true,
        entityName: true,
        id: true,
        metadata: true,
        newValue: true,
        oldValue: true,
        actorEmailSnapshot: true,
        actorNameSnapshot: true,
        performedBy: {
          select: {
            email: true,
            fullName: true,
          },
        },
        performedById: true,
      },
    });

    return {
      documentId,
      total: items.length,
      order: "createdAt:desc",
      items: items.map((item) => ({
        id: item.id,
        action: normalizeDocumentAuditAction(item.action),
        rawAction: item.action,
        entityType: item.entityName,
        entityId: item.entityId,
        performedBy: {
          id: item.performedById,
          name: item.actorNameSnapshot ?? item.performedBy?.fullName ?? null,
          email: item.actorEmailSnapshot ?? item.performedBy?.email ?? null,
        },
        createdAt: item.createdAt.toISOString(),
        metadata: summarizeAuditMetadata(item.metadata),
        oldValue: sanitizeDocumentAuditValue(item.oldValue),
        newValue: sanitizeDocumentAuditValue(item.newValue),
      })),
    };
  }

  async deleteRelation(
    documentId: string,
    relationId: string,
    audit: AuditRequestContext,
  ) {
    const relation = await this.prisma.documentRelation.findFirst({
      where: {
        id: relationId,
        documentId,
        deletedAt: null,
      },
      include: documentRelationResponseInclude,
    });

    if (!relation) {
      throw new NotFoundException("Document relation not found");
    }

    await this.ensureUserCanAccessProject(audit.actorId, relation.document.projectId);

    const deleted = await this.prisma.documentRelation.update({
      where: {
        id: relation.id,
      },
      data: {
        deletedAt: new Date(),
      },
      include: documentRelationResponseInclude,
    });

    await this.auditService.record({
      ...audit,
      action: "DOCUMENT_RELATION_DELETED",
      entity: "DocumentRelation",
      entityId: deleted.id,
      oldValue: toDocumentRelationAuditValue(relation),
      newValue: toDocumentRelationAuditValue(deleted),
    });

    return toDocumentRelationResponse(deleted);
  }

  async findDailyLogDocuments(dailyLogId: string, currentUserId: string) {
    const dailyLog = await this.prisma.dailyLog.findUnique({
      where: {
        id: dailyLogId,
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (!dailyLog) {
      throw new NotFoundException("Daily log not found");
    }

    await this.ensureUserCanAccessProject(currentUserId, dailyLog.projectId);

    const relations = await this.prisma.documentRelation.findMany({
      where: {
        relationType: DocumentRelationType.DAILY_LOG,
        dailyLogId,
        deletedAt: null,
        document: {
          status: {
            not: DocumentStatus.DELETED,
          },
          deletedAt: null,
        },
      },
      include: documentRelationResponseInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    return relations.map(toRelatedDocumentResponse);
  }

  async findDailyLogEventDocuments(eventId: string, currentUserId: string) {
    const event = await this.prisma.dailyLogEvent.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        deletedAt: true,
        dailyLog: {
          select: {
            projectId: true,
          },
        },
      },
    });

    if (!event || event.deletedAt) {
      throw new NotFoundException("Daily log event not found");
    }

    await this.ensureUserCanAccessProject(currentUserId, event.dailyLog.projectId);

    const relations = await this.prisma.documentRelation.findMany({
      where: {
        relationType: DocumentRelationType.DAILY_LOG_EVENT,
        dailyLogEventId: eventId,
        deletedAt: null,
        document: {
          status: {
            not: DocumentStatus.DELETED,
          },
          deletedAt: null,
        },
      },
      include: documentRelationResponseInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    return relations.map(toRelatedDocumentResponse);
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

  async findCategories(currentUserId: string) {
    const accessibleProjectIds =
      await this.projectAccessPolicy.getAccessibleProjectIds(currentUserId);

    const where: Prisma.DocumentCategoryWhereInput = {
      status: "ACTIVE",
    };

    if (accessibleProjectIds) {
      if (accessibleProjectIds.length === 0) {
        return [];
      }

      const projects = await this.prisma.project.findMany({
        where: {
          id: {
            in: accessibleProjectIds,
          },
        },
        select: {
          id: true,
          organizationId: true,
        },
      });
      const organizationIds = Array.from(
        new Set(projects.map((project) => project.organizationId)),
      );
      const projectIds = projects.map((project) => project.id);

      where.OR = [
        {
          organizationId: {
            in: organizationIds,
          },
          projectId: null,
        },
        {
          projectId: {
            in: projectIds,
          },
        },
      ];
    }

    const categories = await this.prisma.documentCategory.findMany({
      where,
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
      select: {
        id: true,
        organizationId: true,
        projectId: true,
        parentId: true,
        code: true,
        name: true,
        description: true,
        status: true,
        sortOrder: true,
      },
    });

    return categories;
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

    const currentVersion = document.currentVersionId
      ? await this.prisma.documentVersion.findUnique({
          where: {
            id: document.currentVersionId,
          },
          select: documentVersionResponseSelect,
        })
      : null;

    const download = currentVersion
      ? await this.resolveVersionDownload(currentVersion)
      : await this.resolveLegacyDocumentDownload(document);

    const auditValue = this.toAuditValue(document);

    await this.auditService.record({
      ...audit,
      action: "DOCUMENT_DOWNLOADED",
      entity: "Document",
      entityId: document.id,
      newValue: {
        ...auditValue,
        documentVersionId: currentVersion?.id ?? null,
        downloaded: true,
      },
    });

    return {
      fileName: download.fileName,
      filePath: download.filePath,
      mimeType: download.mimeType,
      size: download.size,
    };
  }

  async getVersionDownload(id: string, audit: AuditRequestContext) {
    const version = await this.prisma.documentVersion.findFirst({
      where: {
        id,
        deletedAt: null,
        document: {
          status: {
            not: DocumentStatus.DELETED,
          },
        },
      },
      select: {
        ...documentVersionResponseSelect,
        document: {
          select: {
            id: true,
            projectId: true,
            organizationId: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!version) {
      throw new NotFoundException("Document version not found");
    }

    await this.ensureUserCanAccessProject(audit.actorId, version.document.projectId);
    const download = await this.resolveVersionDownload(version);

    await this.auditService.record({
      ...audit,
      action: "DOCUMENT_DOWNLOADED",
      entity: "DocumentVersion",
      entityId: version.id,
      newValue: {
        ...toDocumentVersionResponse(version),
        documentId: version.document.id,
        downloaded: true,
      },
    });

    return download;
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
    await this.ensureDocumentCategory(
      updateDocumentDto.categoryId,
      context.project.organizationId,
      context.project.id,
    );

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
          categoryId: updateDocumentDto.categoryId,
          updatedById: audit.actorId,
          code: updateDocumentDto.code,
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
          visibility: updateDocumentDto.visibility,
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
        deletedById: audit.actorId,
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
      organizationId: query.organizationId,
      dailyLogId: query.dailyLogId,
      eventId: query.eventId,
      categoryId: query.categoryId,
      type: query.type,
      status: query.status ?? DocumentStatus.ACTIVE,
      visibility: query.visibility,
      OR: query.search?.trim()
        ? [
            {
              title: {
                contains: query.search.trim(),
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: query.search.trim(),
                mode: "insensitive",
              },
            },
            {
              code: {
                contains: query.search.trim(),
                mode: "insensitive",
              },
            },
            {
              fileName: {
                contains: query.search.trim(),
                mode: "insensitive",
              },
            },
          ]
        : undefined,
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

  private async resolveExistingDocumentUploadContext(
    documentId: string,
    currentUserId: string,
  ) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        status: {
          not: DocumentStatus.DELETED,
        },
      },
      select: {
        id: true,
        projectId: true,
        organizationId: true,
      },
    });

    if (!document) {
      throw new NotFoundException("Document not found");
    }

    await this.ensureUserCanAccessProject(currentUserId, document.projectId);

    return {
      project: {
        id: document.projectId,
        organizationId: document.organizationId,
      },
      dailyLog: null,
      event: null,
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

  private async ensureDocumentCategory(
    categoryId: string | undefined,
    organizationId: string,
    projectId: string,
  ) {
    if (!categoryId) {
      return;
    }

    const category = await this.prisma.documentCategory.findUnique({
      where: {
        id: categoryId,
      },
      select: {
        organizationId: true,
        projectId: true,
        status: true,
      },
    });

    if (!category || category.status !== "ACTIVE") {
      throw new BadRequestException("Invalid categoryId reference");
    }

    if (category.organizationId !== organizationId) {
      throw new BadRequestException(
        "categoryId must belong to the same organization as the document.",
      );
    }

    if (category.projectId && category.projectId !== projectId) {
      throw new BadRequestException(
        "categoryId must belong to the same project as the document.",
      );
    }
  }

  private async resolveRelationTarget(
    dto: CreateDocumentRelationDto,
    currentUserId: string,
  ) {
    if (dto.relationType === DocumentRelationType.DAILY_LOG) {
      if (!dto.dailyLogId) {
        throw new BadRequestException("dailyLogId is required.");
      }

      const dailyLog = await this.prisma.dailyLog.findUnique({
        where: {
          id: dto.dailyLogId,
        },
        select: {
          id: true,
          projectId: true,
        },
      });

      if (!dailyLog) {
        throw new NotFoundException("Daily log not found");
      }

      await this.ensureUserCanAccessProject(currentUserId, dailyLog.projectId);

      return {
        projectId: dailyLog.projectId,
        dailyLogId: dailyLog.id,
        dailyLogEventId: null,
      };
    }

    if (dto.relationType === DocumentRelationType.DAILY_LOG_EVENT) {
      if (!dto.dailyLogEventId) {
        throw new BadRequestException("dailyLogEventId is required.");
      }

      const event = await this.prisma.dailyLogEvent.findUnique({
        where: {
          id: dto.dailyLogEventId,
        },
        select: {
          id: true,
          deletedAt: true,
          dailyLog: {
            select: {
              projectId: true,
            },
          },
        },
      });

      if (!event || event.deletedAt) {
        throw new NotFoundException("Daily log event not found");
      }

      await this.ensureUserCanAccessProject(currentUserId, event.dailyLog.projectId);

      return {
        projectId: event.dailyLog.projectId,
        dailyLogId: null,
        dailyLogEventId: event.id,
      };
    }

    if (dto.relationType === DocumentRelationType.PROJECT) {
      if (!dto.projectId) {
        throw new BadRequestException("projectId is required.");
      }

      const project = await this.prisma.project.findUnique({
        where: {
          id: dto.projectId,
        },
        select: {
          id: true,
        },
      });

      if (!project) {
        throw new NotFoundException("Project not found");
      }

      await this.ensureUserCanAccessProject(currentUserId, project.id);

      return {
        projectId: project.id,
        dailyLogId: null,
        dailyLogEventId: null,
      };
    }

    throw new BadRequestException("Unsupported document relation type.");
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

  private async storeDocumentFile(
    projectId: string,
    safeFile: ReturnType<typeof validateDocumentFile>,
  ): Promise<StoredDocumentFile> {
    const checksumSha256 = createHash("sha256")
      .update(safeFile.buffer)
      .digest("hex");
    const storagePath = buildDocumentStoragePath(projectId, safeFile.fileName);
    const absoluteStoragePath = join(process.cwd(), storagePath);

    await mkdir(dirname(absoluteStoragePath), { recursive: true });
    await writeFile(absoluteStoragePath, safeFile.buffer, { flag: "wx" });

    return {
      absoluteStoragePath,
      checksumSha256,
      extension: safeFile.extension,
      fileName: safeFile.fileName,
      originalFileName: safeFile.originalFileName,
      mimeType: safeFile.mimeType,
      size: safeFile.size,
      storagePath,
    };
  }

  private async resolveVersionDownload(version: {
    fileName: string;
    mimeType: string | null;
    sizeBytes: bigint | null;
    storageKey: string;
    storagePath: string | null;
  }) {
    const filePath = resolveDocumentStoragePath(
      version.storagePath ?? version.storageKey,
    );

    let fileStat: Awaited<ReturnType<typeof stat>>;

    try {
      await access(filePath, constants.R_OK);
      fileStat = await stat(filePath);
    } catch {
      throw new NotFoundException("Document version file not found");
    }

    return {
      fileName: sanitizeFileName(version.fileName),
      filePath,
      mimeType: version.mimeType || "application/octet-stream",
      size: version.sizeBytes ? Number(version.sizeBytes) : fileStat.size,
    };
  }

  private async resolveLegacyDocumentDownload(document: Document) {
    const filePath = resolveDocumentStoragePath(document.storagePath);

    let fileStat: Awaited<ReturnType<typeof stat>>;

    try {
      await access(filePath, constants.R_OK);
      fileStat = await stat(filePath);
    } catch {
      throw new NotFoundException("Document file not found");
    }

    return {
      fileName: sanitizeFileName(document.fileName),
      filePath,
      mimeType: document.mimeType || "application/octet-stream",
      size: fileStat.size,
    };
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
      categoryId: document.categoryId,
      code: document.code,
      type: document.type,
      title: document.title,
      fileName: document.fileName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes ? Number(document.sizeBytes) : null,
      status: document.status,
      visibility: document.visibility,
      uploadedById: document.uploadedById,
      createdById: document.createdById,
      updatedById: document.updatedById,
      deletedById: document.deletedById,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      deletedAt: document.deletedAt,
    };
  }

  private toDocumentVersionAuditValue(
    version: Prisma.DocumentVersionGetPayload<{
      select: typeof documentVersionResponseSelect;
    }>,
  ) {
    return toDocumentVersionResponse(version);
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
  category: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  uploadedBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} satisfies Prisma.DocumentInclude;

const documentVersionResponseSelect = {
  id: true,
  documentId: true,
  versionNumber: true,
  fileName: true,
  originalName: true,
  originalFileName: true,
  mimeType: true,
  extension: true,
  sizeBytes: true,
  checksumSha256: true,
  storageProvider: true,
  storageKey: true,
  storagePath: true,
  isCurrentVersion: true,
  uploadedById: true,
  changeReason: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.DocumentVersionSelect;

const documentRelationResponseInclude = {
  document: {
    include: {
      category: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      currentVersion: {
        select: documentVersionResponseSelect,
      },
    },
  },
  dailyLog: {
    select: {
      id: true,
      logDate: true,
      status: true,
      projectId: true,
    },
  },
  dailyLogEvent: {
    select: {
      id: true,
      activity: true,
      reportedAt: true,
      dailyLogId: true,
    },
  },
  project: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
} as const satisfies Prisma.DocumentRelationInclude;

type DocumentWithUploader = Prisma.DocumentGetPayload<{
  include: typeof documentResponseInclude;
}>;

type DocumentRelationWithDetails = Prisma.DocumentRelationGetPayload<{
  include: typeof documentRelationResponseInclude;
}>;

function toDocumentResponse(document: DocumentWithUploader) {
  return {
    id: document.id,
    organizationId: document.organizationId,
    projectId: document.projectId,
    dailyLogId: document.dailyLogId,
    eventId: document.eventId,
    categoryId: document.categoryId,
    code: document.code,
    type: document.type,
    title: document.title,
    description: document.description,
    fileName: document.fileName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes ? Number(document.sizeBytes) : null,
    status: document.status,
    visibility: document.visibility,
    metadata: document.metadata,
    uploadedById: document.uploadedById,
    createdById: document.createdById,
    updatedById: document.updatedById,
    deletedById: document.deletedById,
    uploadedBy: document.uploadedBy
      ? {
          id: document.uploadedBy.id,
          fullName: document.uploadedBy.fullName,
          email: document.uploadedBy.email,
        }
      : null,
    category: document.category
      ? {
          id: document.category.id,
          code: document.category.code,
          name: document.category.name,
        }
      : null,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    deletedAt: document.deletedAt,
  };
}

function toDocumentVersionResponse(
  version: Prisma.DocumentVersionGetPayload<{
    select: typeof documentVersionResponseSelect;
  }>,
) {
  return {
    id: version.id,
    documentId: version.documentId,
    versionNumber: version.versionNumber,
    fileName: version.fileName,
    originalFileName: version.originalFileName ?? version.originalName,
    mimeType: version.mimeType,
    extension: version.extension,
    sizeBytes: version.sizeBytes ? Number(version.sizeBytes) : null,
    checksumSha256: version.checksumSha256,
    storageProvider: version.storageProvider,
    storagePath: version.storagePath ?? version.storageKey,
    isCurrentVersion: version.isCurrentVersion,
    uploadedById: version.uploadedById,
    changeReason: version.changeReason,
    metadata: version.metadata,
    createdAt: version.createdAt,
    updatedAt: version.updatedAt,
    deletedAt: version.deletedAt,
  };
}

function toDocumentRelationResponse(relation: DocumentRelationWithDetails) {
  return {
    id: relation.id,
    documentId: relation.documentId,
    relationType: relation.relationType,
    organizationId: relation.organizationId,
    projectId: relation.projectId,
    dailyLogId: relation.dailyLogId,
    dailyLogEventId: relation.dailyLogEventId,
    metadata: relation.metadata,
    createdById: relation.createdById,
    createdAt: relation.createdAt,
    updatedAt: relation.updatedAt,
    deletedAt: relation.deletedAt,
    target: {
      dailyLog: relation.dailyLog,
      dailyLogEvent: relation.dailyLogEvent,
      project: relation.project,
    },
  };
}

function toRelatedDocumentResponse(relation: DocumentRelationWithDetails) {
  const currentVersion = relation.document.currentVersion
    ? toPublicDocumentVersionResponse(relation.document.currentVersion)
    : null;

  return {
    relation: toDocumentRelationResponse(relation),
    document: {
      id: relation.document.id,
      organizationId: relation.document.organizationId,
      projectId: relation.document.projectId,
      categoryId: relation.document.categoryId,
      code: relation.document.code,
      type: relation.document.type,
      title: relation.document.title,
      description: relation.document.description,
      fileName: relation.document.fileName,
      mimeType: relation.document.mimeType,
      sizeBytes: relation.document.sizeBytes
        ? Number(relation.document.sizeBytes)
        : null,
      status: relation.document.status,
      visibility: relation.document.visibility,
      category: relation.document.category,
      currentVersion,
      createdAt: relation.document.createdAt,
      updatedAt: relation.document.updatedAt,
      deletedAt: relation.document.deletedAt,
    },
  };
}

function toPublicDocumentVersionResponse(
  version: Prisma.DocumentVersionGetPayload<{
    select: typeof documentVersionResponseSelect;
  }>,
) {
  return {
    id: version.id,
    documentId: version.documentId,
    versionNumber: version.versionNumber,
    fileName: version.fileName,
    originalFileName: version.originalFileName ?? version.originalName,
    mimeType: version.mimeType,
    extension: version.extension,
    sizeBytes: version.sizeBytes ? Number(version.sizeBytes) : null,
    checksumSha256: version.checksumSha256,
    storageProvider: version.storageProvider,
    isCurrentVersion: version.isCurrentVersion,
    uploadedById: version.uploadedById,
    changeReason: version.changeReason,
    metadata: version.metadata,
    createdAt: version.createdAt,
    updatedAt: version.updatedAt,
    deletedAt: version.deletedAt,
  };
}

function toDocumentRelationAuditValue(relation: DocumentRelationWithDetails) {
  return {
    id: relation.id,
    documentId: relation.documentId,
    relationType: relation.relationType,
    organizationId: relation.organizationId,
    projectId: relation.projectId,
    dailyLogId: relation.dailyLogId,
    dailyLogEventId: relation.dailyLogEventId,
    deletedAt: relation.deletedAt,
    documentTitle: relation.document.title,
    documentCode: relation.document.code,
  };
}

function normalizeDocumentAuditAction(action: string) {
  const aliases: Record<string, string> = {
    CREATE_DOCUMENT: "DOCUMENT_CREATED",
    UPDATE_DOCUMENT: "DOCUMENT_UPDATED",
    DELETE_DOCUMENT: "DOCUMENT_DELETED",
    DOWNLOAD_DOCUMENT: "DOCUMENT_DOWNLOADED",
  };

  return aliases[action] ?? action;
}

function summarizeAuditMetadata(value: Prisma.JsonValue | null) {
  return sanitizeDocumentAuditValue(value);
}

function sanitizeDocumentAuditValue(value: Prisma.JsonValue | null): unknown {
  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeDocumentAuditValue(item));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !isSensitiveDocumentAuditKey(key))
        .map(([key, item]) => [
          key,
          sanitizeDocumentAuditValue(item as Prisma.JsonValue),
        ]),
    );
  }

  if (typeof value === "string" && isSensitiveDocumentAuditString(value)) {
    return "[redacted]";
  }

  return value;
}

function isSensitiveDocumentAuditKey(key: string) {
  const normalized = key.toLowerCase();

  return (
    normalized.includes("storagepath") ||
    normalized.includes("storagekey") ||
    normalized.includes("storageurl") ||
    normalized.includes("absolute") ||
    normalized.includes("path") ||
    normalized.includes("token") ||
    normalized.includes("secret") ||
    normalized.includes("password")
  );
}

function isSensitiveDocumentAuditString(value: string) {
  const normalized = value.toLowerCase();

  return (
    normalized.includes("storage\\") ||
    normalized.includes("storage/") ||
    normalized.includes("document-control/") ||
    normalized.includes("bearer ") ||
    normalized.includes("token")
  );
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

function buildMetadataOnlyFileName(title: string) {
  return `${sanitizeFileName(title)}.metadata`;
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
    extension,
    fileName,
    mimeType: file.mimetype,
    originalFileName: sanitizeFileName(file.originalname),
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
