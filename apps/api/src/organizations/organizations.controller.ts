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
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { OrganizationsService } from "./organizations.service";

@ApiTags("organizations")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: "List organizations" })
  @ApiQuery({ name: "status", enum: RecordStatus, required: false })
  @ApiQuery({ name: "nit", required: false })
  @ApiQuery({ name: "name", required: false })
  @Permissions("organizations:read")
  findAll(
    @Query("status") status?: RecordStatus,
    @Query("nit") nit?: string,
    @Query("name") name?: string,
  ) {
    return this.organizationsService.findAll({ status, nit, name });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get organization by id" })
  @ApiParam({ name: "id", description: "Organization UUID" })
  @Permissions("organizations:read")
  findOne(@Param("id") id: string) {
    return this.organizationsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create organization" })
  @Permissions("organizations:create")
  create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.organizationsService.create(createOrganizationDto, audit);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update organization" })
  @ApiParam({ name: "id", description: "Organization UUID" })
  @Permissions("organizations:update")
  update(
    @Param("id") id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.organizationsService.update(id, updateOrganizationDto, audit);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft delete organization" })
  @ApiParam({ name: "id", description: "Organization UUID" })
  @Permissions("organizations:delete")
  remove(
    @Param("id") id: string,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.organizationsService.remove(id, audit);
  }
}
