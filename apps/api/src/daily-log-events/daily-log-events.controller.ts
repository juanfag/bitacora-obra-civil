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
  ApiBadRequestResponse,
  ApiConflictResponse,
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
import {
  CurrentUser,
  CurrentUserPayload,
} from "../auth/decorators/current-user.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { DailyLogEventsService } from "./daily-log-events.service";
import { CreateDailyLogEventDto } from "./dto/create-daily-log-event.dto";
import { FindDailyLogEventsQueryDto } from "./dto/find-daily-log-events-query.dto";
import { UpdateDailyLogEventDto } from "./dto/update-daily-log-event.dto";

@ApiTags("daily-log-events")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
@ApiForbiddenResponse({ description: "Authenticated user does not have the required permission." })
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("daily-log-events")
export class DailyLogEventsController {
  constructor(
    private readonly dailyLogEventsService: DailyLogEventsService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create daily log event" })
  @ApiCreatedResponse({ description: "Daily log event created." })
  @ApiBadRequestResponse({ description: "Invalid payload, dailyLogId, or eventTypeId reference." })
  @ApiConflictResponse({
    description: "Parent daily log must be editable before events can be created.",
  })
  @Permissions("daily-log-events:create")
  create(
    @Body() createDailyLogEventDto: CreateDailyLogEventDto,
    @CurrentUser() user: CurrentUserPayload,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.dailyLogEventsService.create(createDailyLogEventDto, {
      ...audit,
      actorId: user.sub,
    });
  }

  @Get()
  @ApiOperation({ summary: "List daily log events" })
  @ApiOkResponse({ description: "Daily log events returned with pagination metadata." })
  @ApiBadRequestResponse({ description: "Invalid query parameters." })
  @Permissions("daily-log-events:read")
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: FindDailyLogEventsQueryDto,
  ) {
    return this.dailyLogEventsService.findAll(query, user.sub);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get daily log event by id" })
  @ApiParam({ name: "id", description: "Daily log event UUID" })
  @ApiOkResponse({ description: "Daily log event returned." })
  @ApiNotFoundResponse({ description: "Daily log event not found." })
  @Permissions("daily-log-events:read")
  findOne(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.dailyLogEventsService.findOne(id, user.sub);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update daily log event" })
  @ApiParam({ name: "id", description: "Daily log event UUID" })
  @ApiOkResponse({ description: "Daily log event updated." })
  @ApiBadRequestResponse({ description: "Invalid payload, dailyLogId, or eventTypeId reference." })
  @ApiNotFoundResponse({ description: "Daily log event not found." })
  @ApiConflictResponse({
    description: "Parent daily log must be editable before events can be updated.",
  })
  @Permissions("daily-log-events:update")
  update(
    @Param("id") id: string,
    @Body() updateDailyLogEventDto: UpdateDailyLogEventDto,
    @CurrentUser() user: CurrentUserPayload,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.dailyLogEventsService.update(
      id,
      updateDailyLogEventDto,
      {
        ...audit,
        actorId: user.sub,
      },
    );
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft delete daily log event" })
  @ApiParam({ name: "id", description: "Daily log event UUID" })
  @ApiOkResponse({ description: "Daily log event soft deleted." })
  @ApiNotFoundResponse({ description: "Daily log event not found." })
  @ApiConflictResponse({
    description: "Parent daily log must be editable before events can be deleted.",
  })
  @Permissions("daily-log-events:delete")
  remove(
    @Param("id") id: string,
    @CurrentUser() user: CurrentUserPayload,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.dailyLogEventsService.remove(id, {
      ...audit,
      actorId: user.sub,
    });
  }
}
