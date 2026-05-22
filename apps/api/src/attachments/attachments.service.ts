import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DailyLogStatus, Prisma, RecordStatus } from "@prisma/client";
import { access, readFile, stat, unlink } from "node:fs/promises";
import { constants } from "node:fs";
import { createHash } from "node:crypto";
import { basename, extname } from "node:path";
import { AuditService } from "../audit/audit.service";
import { AuditRequestContext } from "../audit/audit.types";
import { isEditableStatus } from "../daily-logs/daily-log-status.helper";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectAccessPolicy } from "../projects/project-access.policy";
import { UploadedFile } from "../uploads/upload-file.types";
import { UploadAttachmentDto } from "./dto/upload-attachment.dto";

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly projectAccessPolicy: ProjectAccessPolicy,
  ) {}

  async upload(
    uploadAttachmentDto: UploadAttachmentDto,
    file: UploadedFile,
    audit: AuditRequestContext,
  ) {
    // TODO: Add antivirus scanning before metadata persistence when an AV service
    // is available in the deployment environment.
    try {
      await this.ensureDailyLogEventCanReceiveAttachments(
        uploadAttachmentDto.dailyLogEventId,
      );

      const checksumSha256 = await calculateSha256(file.path);
      const sanitizedFilename = file.sanitizedOriginalName ?? file.originalname;
      const originalFilename = getOriginalDisplayFileName(file.originalname);
      const extension = getFileExtension(sanitizedFilename);

      const attachment = await this.prisma.attachment.create({
        data: {
          dailyLogEventId: uploadAttachmentDto.dailyLogEventId,
          filename: file.filename,
          originalName: originalFilename,
          originalFilename,
          sanitizedFilename,
          mimeType: file.mimetype,
          extension,
          size: file.size,
          sizeBytes: file.size,
          checksumSha256,
          storageProvider: "local",
          path: file.path,
          storagePath: file.path,
          uploadedById: audit.actorId,
          uploadedAt: new Date(),
          isInlinePreviewAllowed: isInlinePreviewMimeType(file.mimetype),
          createdById: audit.actorId,
        },
        include: attachmentResponseInclude,
      });

      await this.auditService.record({
        ...audit,
        action: "CREATE",
        entity: "Attachment",
        entityId: attachment.id,
      });

      return toAttachmentResponse(attachment);
    } catch (error) {
      await this.safeDeleteFile(file.path);
      this.handlePrismaError(error);
    }
  }

  async discardUploadedFile(path: string) {
    await this.safeDeleteFile(path);
  }

  async findOne(id: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id,
        status: RecordStatus.ACTIVE,
      },
      include: attachmentResponseInclude,
    });

    if (!attachment) {
      throw new NotFoundException("Attachment not found");
    }

    return toAttachmentResponse(attachment);
  }

  async findByDailyLogEvent(dailyLogEventId: string) {
    await this.ensureDailyLogEventExists(dailyLogEventId);

    const attachments = await this.prisma.attachment.findMany({
      where: {
        dailyLogEventId,
        status: RecordStatus.ACTIVE,
      },
      include: attachmentResponseInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    return attachments.map(toAttachmentResponse);
  }

  async getDownload(id: string, userId: string) {
    const attachment = await this.findActiveAttachmentWithProjectContext(id);

    const canAccessProject = await this.projectAccessPolicy.canAccessProject(
      userId,
      attachment.dailyLogEvent.dailyLog.projectId,
    );

    if (!canAccessProject) {
      throw new ForbiddenException("User does not have access to this project.");
    }

    try {
      const filePath = attachment.storagePath || attachment.path;
      await access(filePath, constants.R_OK);
      const fileStat = await stat(filePath);

      return {
        fileName:
          attachment.sanitizedFilename ||
          attachment.filename ||
          attachment.originalName,
        filePath,
        mimeType: attachment.mimeType,
        size: fileStat.size,
      };
    } catch {
      throw new NotFoundException("Attachment file not found");
    }
  }

  async remove(id: string, audit: AuditRequestContext) {
    const attachment = await this.findActiveAttachmentWithDailyLogContext(id);
    await this.ensureCanDeleteAttachment(attachment, audit.actorId);

    const deletedAttachment = await this.prisma.attachment.update({
      where: { id },
      data: {
        status: RecordStatus.DELETED,
        deletedById: audit.actorId,
      },
    });

    await this.safeDeleteFile(attachment.path);

    await this.auditService.record({
      ...audit,
      action: "DELETE",
      entity: "Attachment",
      entityId: deletedAttachment.id,
    });

    return deletedAttachment;
  }

  private async findActiveAttachmentWithDailyLogContext(id: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id,
        status: RecordStatus.ACTIVE,
      },
      include: {
        dailyLogEvent: {
          include: {
            dailyLog: {
              select: {
                projectId: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException("Attachment not found");
    }

    if (attachment.dailyLogEvent.deletedAt) {
      throw new ConflictException(
        "Attachment cannot be deleted because its daily log event is deleted.",
      );
    }

    return attachment;
  }

  private async findActiveAttachmentWithProjectContext(id: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id,
        status: RecordStatus.ACTIVE,
      },
      include: {
        dailyLogEvent: {
          include: {
            dailyLog: {
              select: {
                projectId: true,
              },
            },
          },
        },
      },
    });

    if (!attachment || attachment.dailyLogEvent.deletedAt) {
      throw new NotFoundException("Attachment not found");
    }

    return attachment;
  }

  private async ensureCanDeleteAttachment(
    attachment: Awaited<
      ReturnType<AttachmentsService["findActiveAttachmentWithDailyLogContext"]>
    >,
    userId: string,
  ) {
    const canAccessProject =
      await this.projectAccessPolicy.canAccessProject(
        userId,
        attachment.dailyLogEvent.dailyLog.projectId,
      );

    if (!canAccessProject) {
      throw new ForbiddenException("User does not have access to this project.");
    }

    if (attachment.dailyLogEvent.dailyLog.status !== DailyLogStatus.DRAFT) {
      throw new ConflictException(
        "Attachments can only be deleted while the daily log is DRAFT.",
      );
    }
  }

  private async ensureDailyLogEventExists(dailyLogEventId: string) {
    const dailyLogEvent = await this.prisma.dailyLogEvent.findUnique({
      where: {
        id: dailyLogEventId,
      },
      select: {
        id: true,
        deletedAt: true,
      },
    });

    if (!dailyLogEvent || dailyLogEvent.deletedAt) {
      throw new BadRequestException("Invalid dailyLogEventId reference");
    }
  }

  private async ensureDailyLogEventCanReceiveAttachments(
    dailyLogEventId: string,
  ) {
    const dailyLogEvent = await this.prisma.dailyLogEvent.findUnique({
      where: {
        id: dailyLogEventId,
      },
      select: {
        id: true,
        deletedAt: true,
        dailyLog: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!dailyLogEvent || dailyLogEvent.deletedAt) {
      throw new BadRequestException("Invalid dailyLogEventId reference");
    }

    if (!isEditableStatus(dailyLogEvent.dailyLog.status)) {
      throw new ConflictException(
        "Attachments can only be uploaded while the daily log is editable.",
      );
    }
  }

  private async safeDeleteFile(path: string) {
    try {
      await unlink(path);
    } catch {
      return;
    }
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        throw new BadRequestException(
          "Invalid dailyLogEventId or uploadedBy reference",
        );
      }

      if (error.code === "P2025") {
        throw new NotFoundException("Attachment not found");
      }
    }

    throw error;
  }
}

const attachmentResponseInclude = {
  uploadedBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  },
} satisfies Prisma.AttachmentInclude;

type AttachmentWithUploader = Prisma.AttachmentGetPayload<{
  include: typeof attachmentResponseInclude;
}>;

function toAttachmentResponse(attachment: AttachmentWithUploader) {
  return {
    id: attachment.id,
    dailyLogEventId: attachment.dailyLogEventId,
    originalFilename:
      attachment.originalFilename ?? attachment.originalName ?? null,
    sanitizedFilename:
      attachment.sanitizedFilename ?? attachment.filename ?? null,
    fileName:
      attachment.originalFilename ??
      attachment.originalName ??
      attachment.sanitizedFilename ??
      attachment.filename ??
      null,
    filename: attachment.sanitizedFilename ?? attachment.filename ?? null,
    originalName: attachment.originalName,
    mimeType: attachment.mimeType,
    extension:
      attachment.extension ??
      getFileExtension(attachment.sanitizedFilename ?? attachment.filename),
    sizeBytes: attachment.sizeBytes ?? attachment.size,
    size: attachment.size,
    checksumSha256: attachment.checksumSha256,
    storageProvider: attachment.storageProvider,
    uploadedAt: attachment.uploadedAt ?? attachment.createdAt,
    uploadedById: attachment.uploadedById,
    uploadedBy: attachment.uploadedBy
      ? {
          id: attachment.uploadedBy.id,
          fullName: attachment.uploadedBy.fullName,
          email: attachment.uploadedBy.email,
        }
      : null,
    isInlinePreviewAllowed:
      attachment.isInlinePreviewAllowed ||
      isInlinePreviewMimeType(attachment.mimeType),
    createdAt: attachment.createdAt,
    updatedAt: attachment.updatedAt,
  };
}

async function calculateSha256(filePath: string) {
  const buffer = await readFile(filePath);

  return createHash("sha256").update(buffer).digest("hex");
}

function getFileExtension(fileName: string | null | undefined) {
  const extension = extname(fileName || "").replace(".", "").toLowerCase();

  return extension || null;
}

function getOriginalDisplayFileName(fileName: string) {
  return (
    basename(fileName || "archivo-adjunto")
      .replace(/[\r\n\t]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 250) || "archivo-adjunto"
  );
}

function isInlinePreviewMimeType(mimeType: string | null | undefined) {
  return (
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "application/pdf"
  );
}
