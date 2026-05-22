import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Res,
  UploadedFile as UploadedFileDecorator,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { createReadStream } from "node:fs";
import { Response } from "express";
import { AuditRequestContext } from "../audit/audit.types";
import { AuditContext } from "../audit/decorators/audit-context.decorator";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../auth/decorators/current-user.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { uploadConfig } from "../uploads/upload.config";
import { UploadedFile } from "../uploads/upload-file.types";
import {
  validateUploadFile,
  validateUploadFileMagicBytes,
} from "../uploads/upload.validators";
import { AttachmentsService } from "./attachments.service";
import { UploadAttachmentDto } from "./dto/upload-attachment.dto";

@ApiTags("attachments")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
@ApiForbiddenResponse({ description: "Authenticated user does not have the required permission." })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class AttachmentsController {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    @Inject(uploadConfig.KEY)
    private readonly config: ConfigType<typeof uploadConfig>,
  ) {}

  @Post("attachments/upload")
  @ApiOperation({ summary: "Upload attachment" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["dailyLogEventId", "file"],
      properties: {
        dailyLogEventId: {
          type: "string",
          format: "uuid",
        },
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiCreatedResponse({ description: "Attachment uploaded and metadata stored." })
  @ApiBadRequestResponse({
    description:
      "Missing file, invalid dailyLogEventId, unsupported MIME type, or file too large.",
  })
  @ApiConflictResponse({
    description: "Parent daily log must be editable before attachments can be uploaded.",
  })
  @Permissions("attachments:create")
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @Body() uploadAttachmentDto: UploadAttachmentDto,
    @UploadedFileDecorator() file: UploadedFile | undefined,
    @AuditContext() audit: AuditRequestContext,
  ) {
    const sanitizedOriginalName = validateUploadFile(file, this.config);
    const uploadedFile = file as UploadedFile;
    uploadedFile.sanitizedOriginalName = sanitizedOriginalName;

    try {
      await validateUploadFileMagicBytes(uploadedFile);
    } catch (error) {
      await this.attachmentsService.discardUploadedFile(uploadedFile.path);
      throw error;
    }

    return this.attachmentsService.upload(
      uploadAttachmentDto,
      uploadedFile,
      audit,
    );
  }

  @Get("attachments/:id")
  @ApiOperation({ summary: "Get attachment by id" })
  @ApiParam({ name: "id", description: "Attachment UUID" })
  @ApiOkResponse({ description: "Attachment metadata returned." })
  @ApiNotFoundResponse({ description: "Attachment not found." })
  @Permissions("attachments:read")
  findOne(@Param("id") id: string) {
    return this.attachmentsService.findOne(id);
  }

  @Get("daily-log-events/:id/attachments")
  @ApiOperation({ summary: "List attachments by daily log event" })
  @ApiParam({ name: "id", description: "Daily log event UUID" })
  @ApiOkResponse({ description: "Attachments for the daily log event returned." })
  @ApiBadRequestResponse({ description: "Invalid dailyLogEventId reference." })
  @Permissions("attachments:read")
  findByDailyLogEvent(@Param("id") id: string) {
    return this.attachmentsService.findByDailyLogEvent(id);
  }

  @Get("attachments/:id/download")
  @ApiOperation({ summary: "Download or preview attachment file" })
  @ApiParam({ name: "id", description: "Attachment UUID" })
  @ApiQuery({
    name: "disposition",
    enum: ["inline", "attachment"],
    required: false,
  })
  @ApiOkResponse({ description: "Attachment file returned." })
  @ApiNotFoundResponse({ description: "Attachment or file not found." })
  @ApiForbiddenResponse({
    description: "Authenticated user does not have access to the project.",
  })
  @Permissions("attachments:read")
  async download(
    @Param("id") id: string,
    @Query("disposition") disposition: "inline" | "attachment" = "attachment",
    @CurrentUser() user: CurrentUserPayload,
    @Res() response: Response,
  ) {
    const file = await this.attachmentsService.getDownload(id, user.sub);
    const safeDisposition =
      disposition === "inline" && isInlineMimeType(file.mimeType)
        ? "inline"
        : "attachment";

    response.setHeader("Content-Type", file.mimeType || "application/octet-stream");
    response.setHeader("Content-Length", file.size);
    response.setHeader(
      "Content-Disposition",
      buildContentDisposition(safeDisposition, file.fileName),
    );

    createReadStream(file.filePath).pipe(response);
  }

  @Delete("attachments/:id")
  @ApiOperation({
    summary: "Delete attachment",
    description:
      "Soft deletes attachment metadata and removes the local file only when the related daily log is DRAFT and the user can access its project.",
  })
  @ApiParam({ name: "id", description: "Attachment UUID" })
  @ApiOkResponse({ description: "Attachment soft deleted." })
  @ApiNotFoundResponse({ description: "Attachment does not exist." })
  @ApiForbiddenResponse({
    description: "Authenticated user does not have access to the project.",
  })
  @ApiConflictResponse({
    description: "Daily log is not in DRAFT or related daily log event is deleted.",
  })
  @Permissions("attachments:delete")
  remove(
    @Param("id") id: string,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.attachmentsService.remove(id, audit);
  }
}

function isInlineMimeType(mimeType: string | null) {
  return Boolean(
    mimeType &&
      (mimeType === "image/jpeg" ||
        mimeType === "image/png" ||
        mimeType === "application/pdf"),
  );
}

function buildContentDisposition(
  disposition: "inline" | "attachment",
  fileName: string,
) {
  const safeFileName = sanitizeDownloadFileName(fileName);
  const fallbackName = safeFileName
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/"/g, "'");
  const encodedName = encodeURIComponent(safeFileName);

  return `${disposition}; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`;
}

function sanitizeDownloadFileName(fileName: string) {
  return fileName
    .replace(/[\\/]+/g, "_")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[<>:"|?*]+/g, "_")
    .trim()
    .slice(0, 150) || "archivo-adjunto";
}
