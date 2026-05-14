import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { EventStatus, Prisma, RecordStatus } from "@prisma/client";
import { unlink } from "node:fs/promises";
import { AuditService } from "../audit/audit.service";
import { AuditRequestContext } from "../audit/audit.types";
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
      await this.ensureEventExists(uploadAttachmentDto.eventId);

      const attachment = await this.prisma.attachment.create({
        data: {
          eventId: uploadAttachmentDto.eventId,
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

  async findByEvent(eventId: string) {
    await this.ensureEventExists(eventId);

    return this.prisma.attachment.findMany({
      where: {
        eventId,
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

  private async ensureEventExists(eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        status: {
          not: EventStatus.VOIDED,
        },
      },
      select: {
        id: true,
      },
    });

    if (!event) {
      throw new BadRequestException("Invalid eventId reference");
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
        throw new BadRequestException("Invalid eventId or uploadedBy reference");
      }

      if (error.code === "P2025") {
        throw new NotFoundException("Attachment not found");
      }
    }

    throw error;
  }
}
