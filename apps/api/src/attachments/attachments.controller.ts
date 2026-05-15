import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
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
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { AuditRequestContext } from "../audit/audit.types";
import { AuditContext } from "../audit/decorators/audit-context.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { uploadConfig } from "../uploads/upload.config";
import { UploadedFile } from "../uploads/upload-file.types";
import { validateUploadFile } from "../uploads/upload.validators";
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
  upload(
    @Body() uploadAttachmentDto: UploadAttachmentDto,
    @UploadedFileDecorator() file: UploadedFile | undefined,
    @AuditContext() audit: AuditRequestContext,
  ) {
    validateUploadFile(file, this.config);
    const uploadedFile = file as UploadedFile;

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
