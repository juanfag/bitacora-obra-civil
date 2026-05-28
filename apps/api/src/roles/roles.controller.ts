import { Controller, Get, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
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
import { AssignableRoleDto } from "./dto/assignable-role-response.dto";
import { RolesService } from "./roles.service";

@ApiTags("roles")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get("assignable")
  @ApiOperation({
    summary: "List active roles assignable by the authenticated user",
  })
  @ApiOkResponse({
    description: "Assignable roles returned.",
    type: [AssignableRoleDto],
  })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
  @ApiForbiddenResponse({ description: "Insufficient permissions." })
  @Permissions("users:manage", "organizations:update", "organizations:create")
  findAssignableRoles(@CurrentUser() user: CurrentUserPayload) {
    return this.rolesService.findAssignableRoles(user.sub);
  }
}
