import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../auth/decorators/current-user.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { DashboardService } from "./dashboard.service";
import { DashboardMetricsResponseDto } from "./dto/dashboard-metrics-response.dto";
import { DashboardRecentActivityResponseDto } from "./dto/dashboard-recent-activity-response.dto";

@ApiTags("dashboard")
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
@ApiForbiddenResponse({
  description: "Authenticated user does not have the required permission.",
})
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("metrics")
  @ApiOperation({
    summary: "Get executive dashboard metrics",
    description:
      "Returns KPI counts scoped to projects accessible by the authenticated user.",
  })
  @ApiOkResponse({
    description: "Dashboard metrics returned.",
    type: DashboardMetricsResponseDto,
  })
  @Permissions("daily-logs:read")
  getMetrics(@CurrentUser() user: CurrentUserPayload) {
    return this.dashboardService.getMetrics(user);
  }

  @Get("recent-activity")
  @ApiOperation({
    summary: "Get executive dashboard recent activity",
    description:
      "Returns recent audit and event activity scoped to projects accessible by the authenticated user.",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Maximum number of recent activity items. Defaults to 20.",
    example: 20,
  })
  @ApiOkResponse({
    description: "Recent activity returned.",
    type: DashboardRecentActivityResponseDto,
  })
  @Permissions("daily-logs:read")
  getRecentActivity(
    @CurrentUser() user: CurrentUserPayload,
    @Query("limit") limit?: string,
  ) {
    return this.dashboardService.getRecentActivity(user, limit);
  }
}
