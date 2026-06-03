import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile as UploadedFileDecorator,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBody,
  ApiBearerAuth,
  ApiBadRequestResponse,
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
import { DocumentsService } from "./documents.service";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { CreateDocumentRelationDto } from "./dto/create-document-relation.dto";
import { FindDocumentsQueryDto } from "./dto/find-documents-query.dto";
import { UpdateDocumentDto } from "./dto/update-document.dto";
import { UploadDocumentDto } from "./dto/upload-document.dto";
import { DocumentEntity } from "./entities/document.entity";

const { memoryStorage } = require("multer") as { memoryStorage: () => never };

@ApiTags("documents")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
@ApiForbiddenResponse({
  description: "Authenticated user does not have the required permission or project access.",
})
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post("upload")
  @ApiOperation({ summary: "Upload a controlled project document" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file", "projectId", "type", "title"],
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
        projectId: {
          type: "string",
          format: "uuid",
        },
        dailyLogId: {
          type: "string",
          format: "uuid",
        },
        eventId: {
          type: "string",
          format: "uuid",
        },
        type: {
          type: "string",
          enum: [
            "PLANO",
            "SOLICITUD_SUSPENSION",
            "DENUNCIA",
            "DEMANDA",
            "ACTA",
            "SOPORTE_FOTOGRAFICO",
            "CONTRATO",
            "OTRO",
          ],
        },
        title: {
          type: "string",
        },
        description: {
          type: "string",
        },
        metadata: {
          type: "string",
          description: "Optional JSON object encoded as a string.",
        },
      },
    },
  })
  @ApiCreatedResponse({ type: DocumentEntity })
  @ApiBadRequestResponse({
    description: "Missing file, unsupported MIME type, unsafe extension, invalid metadata, or inconsistent references.",
  })
  @Permissions("documents:create")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  upload(
    @Body() uploadDocumentDto: UploadDocumentDto,
    @UploadedFileDecorator()
    file:
      | {
          originalname: string;
          mimetype: string;
          size: number;
          buffer: Buffer;
        }
      | undefined,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.documentsService.upload(uploadDocumentDto, file, audit);
  }

  @Post()
  @ApiOperation({ summary: "Create document metadata" })
  @ApiCreatedResponse({ type: DocumentEntity })
  @ApiBadRequestResponse({
    description: "Invalid projectId, dailyLogId, eventId, or payload.",
  })
  @Permissions("documents:create")
  create(
    @Body() createDocumentDto: CreateDocumentDto,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.documentsService.create(createDocumentDto, audit);
  }

  @Get()
  @ApiOperation({ summary: "List document metadata records" })
  @ApiOkResponse({ description: "Document list returned with pagination metadata." })
  @Permissions("documents:read")
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: FindDocumentsQueryDto,
  ) {
    return this.documentsService.findAll(query, user.sub);
  }

  @Get("categories")
  @ApiOperation({ summary: "List document categories available to the current user" })
  @ApiOkResponse({ description: "Document categories returned." })
  @Permissions("documents:read")
  findCategories(@CurrentUser() user: CurrentUserPayload) {
    return this.documentsService.findCategories(user.sub);
  }

  @Get(":id/versions")
  @ApiOperation({ summary: "List versions for a controlled document" })
  @ApiParam({ name: "id", description: "Document UUID" })
  @ApiOkResponse({ description: "Document versions returned." })
  @ApiNotFoundResponse({ description: "Document not found." })
  @Permissions("documents:read")
  findVersions(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.documentsService.findVersions(id, user.sub);
  }

  @Post(":id/relations")
  @ApiOperation({ summary: "Create a relation between a document and a target entity" })
  @ApiCreatedResponse({ description: "Document relation created." })
  @ApiBadRequestResponse({
    description: "Invalid relation target, unsupported relation type, or duplicate relation.",
  })
  @ApiNotFoundResponse({ description: "Document or relation target not found." })
  @Permissions("documents:update")
  createRelation(
    @Param("id") id: string,
    @Body() createRelationDto: CreateDocumentRelationDto,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.documentsService.createRelation(id, createRelationDto, audit);
  }

  @Get(":id/relations")
  @ApiOperation({ summary: "List relations for a document" })
  @ApiOkResponse({ description: "Document relations returned." })
  @ApiNotFoundResponse({ description: "Document not found." })
  @Permissions("documents:read")
  findRelations(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.documentsService.findRelations(id, user.sub);
  }

  @Get(":id/audit")
  @ApiOperation({ summary: "Get document audit timeline" })
  @ApiOkResponse({ description: "Document audit timeline returned." })
  @ApiNotFoundResponse({ description: "Document not found." })
  @Permissions("documents:read")
  getAudit(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.documentsService.getAudit(id, user.sub);
  }

  @Delete(":id/relations/:relationId")
  @ApiOperation({ summary: "Remove a document relation" })
  @ApiOkResponse({ description: "Document relation removed." })
  @ApiNotFoundResponse({ description: "Document relation not found." })
  @Permissions("documents:update")
  deleteRelation(
    @Param("id") id: string,
    @Param("relationId") relationId: string,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.documentsService.deleteRelation(id, relationId, audit);
  }

  @Get(":id/download")
  @ApiOperation({ summary: "Download a controlled document file" })
  @ApiParam({ name: "id", description: "Document UUID" })
  @ApiOkResponse({ description: "Document file returned as an attachment." })
  @ApiNotFoundResponse({ description: "Document or physical file not found." })
  @Permissions("documents:read")
  async download(
    @Param("id") id: string,
    @AuditContext() audit: AuditRequestContext,
    @Res() response: Response,
  ) {
    const download = await this.documentsService.getDownload(id, audit);
    const stream = createReadStream(download.filePath);

    response.setHeader("Content-Type", download.mimeType);
    response.setHeader(
      "Content-Disposition",
      buildAttachmentContentDisposition(download.fileName),
    );
    response.setHeader("Content-Length", String(download.size));
    response.setHeader("X-Content-Type-Options", "nosniff");

    stream.pipe(response);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get document metadata by id" })
  @ApiParam({ name: "id", description: "Document UUID" })
  @ApiOkResponse({ type: DocumentEntity })
  @ApiNotFoundResponse({ description: "Document not found." })
  @Permissions("documents:read")
  findOne(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.documentsService.findOne(id, user.sub);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update document metadata" })
  @ApiParam({ name: "id", description: "Document UUID" })
  @ApiOkResponse({ type: DocumentEntity })
  @ApiBadRequestResponse({
    description: "Invalid projectId, dailyLogId, eventId, or payload.",
  })
  @ApiNotFoundResponse({ description: "Document not found." })
  @Permissions("documents:update")
  update(
    @Param("id") id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.documentsService.update(id, updateDocumentDto, audit);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft delete document metadata" })
  @ApiParam({ name: "id", description: "Document UUID" })
  @ApiOkResponse({ type: DocumentEntity })
  @ApiNotFoundResponse({ description: "Document not found." })
  @Permissions("documents:delete")
  remove(@Param("id") id: string, @AuditContext() audit: AuditRequestContext) {
    return this.documentsService.remove(id, audit);
  }
}

function buildAttachmentContentDisposition(fileName: string) {
  const asciiFileName =
    fileName
      .replace(/[^\x20-\x7E]+/g, "_")
      .replace(/["\\]/g, "_")
      .trim() || "documento";
  const encodedFileName = encodeURIComponent(fileName).replace(
    /['()]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`;
}
