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
import { CreateEventDto } from "./dto/create-event.dto";
import { FindEventsQueryDto } from "./dto/find-events-query.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { EventsService } from "./events.service";

@ApiTags("events")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get("events")
  @ApiOperation({ summary: "List events" })
  @Permissions("events:read")
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: FindEventsQueryDto,
  ) {
    return this.eventsService.findAll(query, user.sub);
  }

  @Get("events/:id")
  @ApiOperation({ summary: "Get event by id" })
  @ApiParam({ name: "id", description: "Event UUID" })
  @Permissions("events:read")
  findOne(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.eventsService.findOne(id, user.sub);
  }

  @Get("daily-logs/:dailyLogId/events")
  @ApiOperation({ summary: "List events by daily log" })
  @ApiParam({ name: "dailyLogId", description: "Daily log UUID" })
  @Permissions("events:read")
  findByDailyLog(
    @CurrentUser() user: CurrentUserPayload,
    @Param("dailyLogId") dailyLogId: string,
    @Query() query: FindEventsQueryDto,
  ) {
    return this.eventsService.findByDailyLog(dailyLogId, query, user.sub);
  }

  @Post("events")
  @ApiOperation({ summary: "Create event" })
  @Permissions("events:create")
  create(
    @Body() createEventDto: CreateEventDto,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.eventsService.create(createEventDto, audit);
  }

  @Patch("events/:id")
  @ApiOperation({ summary: "Update event" })
  @ApiParam({ name: "id", description: "Event UUID" })
  @Permissions("events:update")
  update(
    @Param("id") id: string,
    @Body() updateEventDto: UpdateEventDto,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.eventsService.update(id, updateEventDto, audit);
  }

  @Delete("events/:id")
  @ApiOperation({ summary: "Soft delete event" })
  @ApiParam({ name: "id", description: "Event UUID" })
  @Permissions("events:delete")
  remove(
    @Param("id") id: string,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.eventsService.remove(id, audit);
  }
}
