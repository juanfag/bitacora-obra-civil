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
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
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
  @Permissions("attachments:read")
  findOne(@Param("id") id: string) {
    return this.attachmentsService.findOne(id);
  }

  @Get("daily-log-events/:id/attachments")
  @ApiOperation({ summary: "List attachments by daily log event" })
  @ApiParam({ name: "id", description: "Daily log event UUID" })
  @Permissions("attachments:read")
  findByDailyLogEvent(@Param("id") id: string) {
    return this.attachmentsService.findByDailyLogEvent(id);
  }

  @Delete("attachments/:id")
  @ApiOperation({ summary: "Soft delete attachment" })
  @ApiParam({ name: "id", description: "Attachment UUID" })
  @Permissions("attachments:delete")
  remove(
    @Param("id") id: string,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.attachmentsService.remove(id, audit);
  }
}
