import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, RecordStatus } from "@prisma/client";
import { unlink } from "node:fs/promises";
import { AuditService } from "../audit/audit.service";
import { AuditRequestContext } from "../audit/audit.types";
import { isEditableStatus } from "../daily-logs/daily-log-status.helper";
import { PrismaService } from "../prisma/prisma.service";
import { UploadedFile } from "../uploads/upload-file.types";
import { UploadAttachmentDto } from "./dto/upload-attachment.dto";

@Injectable()
export class AttachmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async upload(
    uploadAttachmentDto: UploadAttachmentDto,
    file: UploadedFile,
    audit: AuditRequestContext,
  ) {
    try {
      await this.ensureDailyLogEventCanReceiveAttachments(
        uploadAttachmentDto.dailyLogEventId,
      );

      const attachment = await this.prisma.attachment.create({
        data: {
          dailyLogEventId: uploadAttachmentDto.dailyLogEventId,
          filename: file.filename,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          path: file.path,
          uploadedById: audit.actorId,
          createdById: audit.actorId,
        },
      });

      await this.auditService.record({
        ...audit,
        action: "CREATE",
        entity: "Attachment",
        entityId: attachment.id,
      });

      return attachment;
    } catch (error) {
      await this.safeDeleteFile(file.path);
      this.handlePrismaError(error);
    }
  }

  async findOne(id: string) {
    const attachment = await this.prisma.attachment.findFirst({
      where: {
        id,
        status: RecordStatus.ACTIVE,
      },
    });

    if (!attachment) {
      throw new NotFoundException("Attachment not found");
    }

    return attachment;
  }

  async findByDailyLogEvent(dailyLogEventId: string) {
    await this.ensureDailyLogEventExists(dailyLogEventId);

    return this.prisma.attachment.findMany({
      where: {
        dailyLogEventId,
        status: RecordStatus.ACTIVE,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async remove(id: string, audit: AuditRequestContext) {
    const attachment = await this.findOne(id);

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
      throw new BadRequestException(
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
