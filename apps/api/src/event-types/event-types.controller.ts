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
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { RecordStatus } from "@prisma/client";
import { AuditRequestContext } from "../audit/audit.types";
import { AuditContext } from "../audit/decorators/audit-context.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { CreateEventTypeDto } from "./dto/create-event-type.dto";
import { UpdateEventTypeDto } from "./dto/update-event-type.dto";
import { EventTypesService } from "./event-types.service";

@ApiTags("event-types")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("event-types")
export class EventTypesController {
  constructor(private readonly eventTypesService: EventTypesService) {}

  @Get()
  @ApiOperation({ summary: "List event types" })
  @ApiQuery({ name: "status", enum: RecordStatus, required: false })
  @Permissions("event-types:read")
  findAll(@Query("status") status?: RecordStatus) {
    return this.eventTypesService.findAll({ status });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get event type by id" })
  @ApiParam({ name: "id", description: "Event type UUID" })
  @Permissions("event-types:read")
  findOne(@Param("id") id: string) {
    return this.eventTypesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create event type" })
  @Permissions("event-types:create")
  create(
    @Body() createEventTypeDto: CreateEventTypeDto,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.eventTypesService.create(createEventTypeDto, audit);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update event type" })
  @ApiParam({ name: "id", description: "Event type UUID" })
  @Permissions("event-types:update")
  update(
    @Param("id") id: string,
    @Body() updateEventTypeDto: UpdateEventTypeDto,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.eventTypesService.update(id, updateEventTypeDto, audit);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft delete event type" })
  @ApiParam({ name: "id", description: "Event type UUID" })
  @Permissions("event-types:delete")
  remove(
    @Param("id") id: string,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.eventTypesService.remove(id, audit);
  }
}
