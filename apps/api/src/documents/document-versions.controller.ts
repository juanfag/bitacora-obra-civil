import { Controller, Get, Param, Res, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
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
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { DocumentsService } from "./documents.service";

@ApiTags("document-versions")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
@ApiForbiddenResponse({
  description: "Authenticated user does not have access to the document version.",
})
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("document-versions")
export class DocumentVersionsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(":id/download")
  @ApiOperation({ summary: "Download a specific controlled document version" })
  @ApiParam({ name: "id", description: "Document version UUID" })
  @ApiOkResponse({ description: "Document version file returned as an attachment." })
  @ApiNotFoundResponse({ description: "Document version or physical file not found." })
  @Permissions("documents:read")
  async downloadVersion(
    @Param("id") id: string,
    @AuditContext() audit: AuditRequestContext,
    @Res() response: Response,
  ) {
    const download = await this.documentsService.getVersionDownload(id, audit);
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
