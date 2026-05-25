import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
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
import { AuditRequestContext } from "../audit/audit.types";
import { AuditContext } from "../audit/decorators/audit-context.decorator";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../auth/decorators/current-user.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { CreateDailyLogDto } from "./dto/create-daily-log.dto";
import { FindDailyLogsQueryDto } from "./dto/find-daily-logs-query.dto";
import { RejectDailyLogDto } from "./dto/reject-daily-log.dto";
import { UpdateDailyLogDto } from "./dto/update-daily-log.dto";
import { DailyLogsService } from "./daily-logs.service";
import { DailyLogPdfService } from "./daily-log-pdf.service";
import { DailyLogProjectAccessGuard } from "./guards/daily-log-project-access.guard";
import { Response } from "express";

@ApiTags("daily-logs")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
@ApiForbiddenResponse({ description: "Authenticated user does not have the required permission." })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class DailyLogsController {
  constructor(
    private readonly dailyLogsService: DailyLogsService,
    private readonly dailyLogPdfService: DailyLogPdfService,
  ) {}

  @Get("daily-logs")
  @ApiOperation({ summary: "List daily logs" })
  @ApiOkResponse({ description: "Daily logs returned with pagination metadata." })
  @ApiBadRequestResponse({ description: "Invalid query parameters." })
  @Permissions("daily-logs:read")
  findAll(@Query() query: FindDailyLogsQueryDto) {
    return this.dailyLogsService.findAll(query);
  }

  @Get("daily-logs/:id/pdf")
  @ApiOperation({ summary: "Download daily log PDF" })
  @ApiParam({ name: "id", description: "Daily log UUID" })
  @ApiOkResponse({ description: "Daily log PDF returned." })
  @ApiNotFoundResponse({ description: "Daily log not found." })
  @Permissions("daily-logs:read")
  async downloadPdf(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
    @AuditContext() audit: AuditRequestContext,
    @Res() response: Response,
  ) {
    const pdf = await this.dailyLogPdfService.generate(id, user, {
      ...audit,
      actorId: user.sub,
    });

    response.setHeader("Content-Type", "application/pdf");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${pdf.fileName}"`,
    );
    response.send(pdf.buffer);
  }

  @Get("daily-logs/:id/document-evidence")
  @ApiOperation({ summary: "Get daily log document evidence" })
  @ApiParam({ name: "id", description: "Daily log UUID" })
  @ApiOkResponse({
    description:
      "Daily log document evidence returned without internal storage paths.",
  })
  @ApiNotFoundResponse({ description: "Daily log not found." })
  @ApiForbiddenResponse({
    description: "Authenticated user does not have access to the project.",
  })
  @Permissions("daily-logs:read")
  getDocumentEvidence(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.dailyLogPdfService.getDocumentEvidence(id, user, {
      ...audit,
      actorId: user.sub,
    });
  }

  @Get("daily-logs/:id")
  @ApiOperation({ summary: "Get daily log by id" })
  @ApiParam({ name: "id", description: "Daily log UUID" })
  @ApiOkResponse({ description: "Daily log returned." })
  @ApiNotFoundResponse({ description: "Daily log not found." })
  @Permissions("daily-logs:read")
  findOne(@Param("id") id: string) {
    return this.dailyLogsService.findOne(id);
  }

  @Get("projects/:projectId/daily-logs")
  @ApiOperation({ summary: "List daily logs by project" })
  @ApiParam({ name: "projectId", description: "Project UUID" })
  @ApiOkResponse({ description: "Project daily logs returned with pagination metadata." })
  @ApiBadRequestResponse({ description: "Invalid projectId or query parameters." })
  @Permissions("daily-logs:read")
  findByProject(
    @Param("projectId") projectId: string,
    @Query() query: FindDailyLogsQueryDto,
  ) {
    return this.dailyLogsService.findByProject(projectId, query);
  }

  @Post("daily-logs")
  @ApiOperation({ summary: "Create daily log" })
  @ApiCreatedResponse({ description: "Daily log created in DRAFT status." })
  @ApiBadRequestResponse({ description: "Invalid payload or projectId reference." })
  @ApiConflictResponse({
    description:
      "Duplicate daily log, missing previous required work day, or previous required work day is not CLOSED.",
  })
  @Permissions("daily-logs:create")
  create(
    @Body() createDailyLogDto: CreateDailyLogDto,
    @CurrentUser() user: CurrentUserPayload,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.dailyLogsService.create(createDailyLogDto, {
      ...audit,
      actorId: user.sub,
    });
  }

  @Patch("daily-logs/:id")
  @ApiOperation({ summary: "Update daily log" })
  @ApiParam({ name: "id", description: "Daily log UUID" })
  @ApiOkResponse({ description: "Daily log updated." })
  @ApiBadRequestResponse({ description: "Invalid payload." })
  @ApiNotFoundResponse({ description: "Daily log not found." })
  @ApiConflictResponse({ description: "Daily log can only be edited while it is DRAFT." })
  @Permissions("daily-logs:update")
  update(
    @Param("id") id: string,
    @Body() updateDailyLogDto: UpdateDailyLogDto,
    @CurrentUser() user: CurrentUserPayload,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.dailyLogsService.update(id, updateDailyLogDto, {
      ...audit,
      actorId: user.sub,
    });
  }

  @Post("daily-logs/:id/submit")
  @ApiOperation({
    summary: "Submit daily log",
    description:
      "Normalized alias for submitting a daily log to the current review state.",
  })
  @ApiParam({ name: "id", description: "Daily log UUID" })
  @ApiCreatedResponse({ description: "Daily log submitted and moved to IN_REVIEW." })
  @ApiNotFoundResponse({ description: "Daily log not found." })
  @ApiForbiddenResponse({ description: "User does not have access to this project." })
  @ApiConflictResponse({ description: "Daily log must be DRAFT to be submitted." })
  @Permissions("daily-logs:update")
  @UseGuards(DailyLogProjectAccessGuard)
  submit(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.dailyLogsService.submitForReview(id, {
      ...audit,
      actorId: user.sub,
    });
  }

  @Post("daily-logs/:id/submit-review")
  @ApiOperation({
    summary: "Submit daily log for review",
    description:
      "Legacy alias maintained for compatibility. Prefer POST /daily-logs/{id}/submit.",
    deprecated: true,
  })
  @ApiParam({ name: "id", description: "Daily log UUID" })
  @ApiCreatedResponse({ description: "Daily log submitted and moved to IN_REVIEW." })
  @ApiNotFoundResponse({ description: "Daily log not found." })
  @ApiForbiddenResponse({ description: "User does not have access to this project." })
  @ApiConflictResponse({ description: "Daily log must be DRAFT to be submitted." })
  @Permissions("daily-logs:update")
  @UseGuards(DailyLogProjectAccessGuard)
  submitForReview(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.dailyLogsService.submitForReview(id, {
      ...audit,
      actorId: user.sub,
    });
  }

  @Post("daily-logs/:id/approve")
  @ApiOperation({ summary: "Approve daily log" })
  @ApiParam({ name: "id", description: "Daily log UUID" })
  @ApiCreatedResponse({ description: "Daily log approved and moved to APPROVED." })
  @ApiNotFoundResponse({ description: "Daily log not found." })
  @ApiForbiddenResponse({ description: "User does not have access to this project." })
  @ApiConflictResponse({ description: "Daily log must be IN_REVIEW to be approved." })
  @Permissions("daily-logs:update")
  @UseGuards(DailyLogProjectAccessGuard)
  approve(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.dailyLogsService.approve(id, {
      ...audit,
      actorId: user.sub,
    });
  }

  @Post("daily-logs/:id/reject")
  @ApiOperation({ summary: "Reject daily log" })
  @ApiParam({ name: "id", description: "Daily log UUID" })
  @ApiBody({ type: RejectDailyLogDto })
  @ApiCreatedResponse({ description: "Daily log rejected and moved to REJECTED." })
  @ApiBadRequestResponse({ description: "Invalid rejection payload." })
  @ApiNotFoundResponse({ description: "Daily log not found." })
  @ApiForbiddenResponse({ description: "User does not have access to this project." })
  @ApiConflictResponse({ description: "Daily log must be IN_REVIEW to be rejected." })
  @Permissions("daily-logs:update")
  @UseGuards(DailyLogProjectAccessGuard)
  reject(
    @Param("id") id: string,
    @Body() rejectDailyLogDto: RejectDailyLogDto,
    @CurrentUser() user: CurrentUserPayload,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.dailyLogsService.reject(id, rejectDailyLogDto, {
      ...audit,
      actorId: user.sub,
    });
  }

  @Post("daily-logs/:id/close")
  @ApiOperation({
    summary: "Close daily log",
    description: "Closes an approved daily log using the current workflow states.",
  })
  @ApiParam({ name: "id", description: "Daily log UUID" })
  @ApiCreatedResponse({ description: "Daily log closed and moved to CLOSED." })
  @ApiNotFoundResponse({ description: "Daily log not found." })
  @ApiForbiddenResponse({ description: "User does not have access to this project." })
  @ApiConflictResponse({ description: "Daily log must be APPROVED to be closed." })
  @Permissions("daily-logs:update")
  @UseGuards(DailyLogProjectAccessGuard)
  async close(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
    @AuditContext() audit: AuditRequestContext,
  ) {
    const dailyLog = await this.dailyLogsService.close(id, {
      ...audit,
      actorId: user.sub,
    });

    await this.dailyLogPdfService.generate(id, user, {
      ...audit,
      actorId: user.sub,
    });

    return dailyLog;
  }

  @Post("daily-logs/:id/return-to-draft")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Return rejected daily log to draft",
    description:
      "Returns a rejected daily log to DRAFT so it can be corrected and submitted again.",
  })
  @ApiParam({ name: "id", description: "Daily log UUID" })
  @ApiOkResponse({ description: "Daily log returned to DRAFT." })
  @ApiNotFoundResponse({ description: "DailyLog not found." })
  @ApiForbiddenResponse({
    description: "User does not have access to this project.",
  })
  @ApiConflictResponse({
    description: "DailyLog must be REJECTED to return to DRAFT.",
  })
  @Permissions("daily-logs:update")
  @UseGuards(DailyLogProjectAccessGuard)
  returnToDraft(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.dailyLogsService.returnToDraft(id, {
      ...audit,
      actorId: user.sub,
    });
  }

  @Post("daily-logs/:id/cancel")
  @ApiOperation({
    summary: "Cancel daily log",
    description:
      "Cancels a daily log using the current VOIDED state until official CANCELLED state migration exists.",
  })
  @ApiParam({ name: "id", description: "Daily log UUID" })
  @ApiCreatedResponse({ description: "Daily log cancelled and moved to VOIDED." })
  @ApiNotFoundResponse({ description: "Daily log not found." })
  @ApiForbiddenResponse({ description: "User does not have access to this project." })
  @ApiConflictResponse({ description: "Daily log cannot be cancelled from CLOSED." })
  @Permissions("daily-logs:delete")
  @UseGuards(DailyLogProjectAccessGuard)
  cancel(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.dailyLogsService.cancel(id, {
      ...audit,
      actorId: user.sub,
    });
  }

  @Delete("daily-logs/:id")
  @ApiOperation({
    summary: "Soft delete daily log",
    description:
      "Legacy cancellation path maintained for compatibility. Prefer POST /daily-logs/{id}/cancel.",
    deprecated: true,
  })
  @ApiParam({ name: "id", description: "Daily log UUID" })
  @ApiOkResponse({ description: "Daily log cancelled and moved to VOIDED." })
  @ApiNotFoundResponse({ description: "Daily log not found." })
  @ApiForbiddenResponse({ description: "User does not have access to this project." })
  @ApiConflictResponse({ description: "Daily log cannot be cancelled from CLOSED." })
  @Permissions("daily-logs:delete")
  @UseGuards(DailyLogProjectAccessGuard)
  remove(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.dailyLogsService.remove(id, {
      ...audit,
      actorId: user.sub,
    });
  }
}
