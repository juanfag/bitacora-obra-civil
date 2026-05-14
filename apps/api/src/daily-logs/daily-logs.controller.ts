import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
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

@ApiTags("daily-logs")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class DailyLogsController {
  constructor(private readonly dailyLogsService: DailyLogsService) {}

  @Get("daily-logs")
  @ApiOperation({ summary: "List daily logs" })
  @Permissions("daily-logs:read")
  findAll(@Query() query: FindDailyLogsQueryDto) {
    return this.dailyLogsService.findAll(query);
  }

  @Get("daily-logs/:id")
  @ApiOperation({ summary: "Get daily log by id" })
  @ApiParam({ name: "id", description: "Daily log UUID" })
  @Permissions("daily-logs:read")
  findOne(@Param("id") id: string) {
    return this.dailyLogsService.findOne(id);
  }

  @Get("projects/:projectId/daily-logs")
  @ApiOperation({ summary: "List daily logs by project" })
  @ApiParam({ name: "projectId", description: "Project UUID" })
  @Permissions("daily-logs:read")
  findByProject(
    @Param("projectId") projectId: string,
    @Query() query: FindDailyLogsQueryDto,
  ) {
    return this.dailyLogsService.findByProject(projectId, query);
  }

  @Post("daily-logs")
  @ApiOperation({ summary: "Create daily log" })
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

  @Post("daily-logs/:id/submit-review")
  @ApiOperation({ summary: "Submit daily log for review" })
  @ApiParam({ name: "id", description: "Daily log UUID" })
  @Permissions("daily-logs:update")
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
  @Permissions("daily-logs:update")
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
  @Permissions("daily-logs:update")
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
  @ApiOperation({ summary: "Close daily log" })
  @ApiParam({ name: "id", description: "Daily log UUID" })
  @Permissions("daily-logs:update")
  close(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.dailyLogsService.close(id, {
      ...audit,
      actorId: user.sub,
    });
  }

  @Delete("daily-logs/:id")
  @ApiOperation({ summary: "Soft delete daily log" })
  @ApiParam({ name: "id", description: "Daily log UUID" })
  @Permissions("daily-logs:delete")
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
