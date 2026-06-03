import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../auth/decorators/current-user.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { DocumentsService } from "./documents.service";

@ApiTags("document-relations")
@ApiBearerAuth()
@ApiForbiddenResponse({
  description: "Authenticated user does not have document read permission or project access.",
})
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class DocumentRelationsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get("daily-logs/:id/documents")
  @ApiOperation({ summary: "List documents related to a daily log" })
  @ApiOkResponse({ description: "Related daily log documents returned." })
  @ApiNotFoundResponse({ description: "Daily log not found." })
  @Permissions("documents:read")
  findDailyLogDocuments(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.documentsService.findDailyLogDocuments(id, user.sub);
  }

  @Get("daily-log-events/:id/documents")
  @ApiOperation({ summary: "List documents related to a daily log event" })
  @ApiOkResponse({ description: "Related daily log event documents returned." })
  @ApiNotFoundResponse({ description: "Daily log event not found." })
  @Permissions("documents:read")
  findDailyLogEventDocuments(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.documentsService.findDailyLogEventDocuments(id, user.sub);
  }
}
