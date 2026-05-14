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
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { DailyLogEventsService } from "./daily-log-events.service";
import { CreateDailyLogEventDto } from "./dto/create-daily-log-event.dto";
import { FindDailyLogEventsQueryDto } from "./dto/find-daily-log-events-query.dto";
import { UpdateDailyLogEventDto } from "./dto/update-daily-log-event.dto";

@ApiTags("daily-log-events")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("daily-log-events")
export class DailyLogEventsController {
  constructor(
    private readonly dailyLogEventsService: DailyLogEventsService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Create daily log event" })
  @Permissions("daily-log-events:create")
  create(
    @Body() createDailyLogEventDto: CreateDailyLogEventDto,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.dailyLogEventsService.create(createDailyLogEventDto, audit);
  }

  @Get()
  @ApiOperation({ summary: "List daily log events" })
  @Permissions("daily-log-events:read")
  findAll(@Query() query: FindDailyLogEventsQueryDto) {
    return this.dailyLogEventsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get daily log event by id" })
  @ApiParam({ name: "id", description: "Daily log event UUID" })
  @Permissions("daily-log-events:read")
  findOne(@Param("id") id: string) {
    return this.dailyLogEventsService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update daily log event" })
  @ApiParam({ name: "id", description: "Daily log event UUID" })
  @Permissions("daily-log-events:update")
  update(
    @Param("id") id: string,
    @Body() updateDailyLogEventDto: UpdateDailyLogEventDto,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.dailyLogEventsService.update(
      id,
      updateDailyLogEventDto,
      audit,
    );
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft delete daily log event" })
  @ApiParam({ name: "id", description: "Daily log event UUID" })
  @Permissions("daily-log-events:delete")
  remove(
    @Param("id") id: string,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.dailyLogEventsService.remove(id, audit);
  }
}
