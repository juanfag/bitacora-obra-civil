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
import { ProjectStatus } from "@prisma/client";
import { AuditRequestContext } from "../audit/audit.types";
import { AuditContext } from "../audit/decorators/audit-context.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { CreateProjectDto } from "./dto/create-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { ProjectsService } from "./projects.service";

@ApiTags("projects")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: "List projects" })
  @ApiQuery({ name: "organizationId", required: false })
  @ApiQuery({ name: "status", enum: ProjectStatus, required: false })
  @Permissions("projects:read")
  findAll(
    @Query("organizationId") organizationId?: string,
    @Query("status") status?: ProjectStatus,
  ) {
    return this.projectsService.findAll({ organizationId, status });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get project by id" })
  @ApiParam({ name: "id", description: "Project UUID" })
  @Permissions("projects:read")
  findOne(@Param("id") id: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create project" })
  @Permissions("projects:create")
  create(
    @Body() createProjectDto: CreateProjectDto,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.projectsService.create(createProjectDto, audit);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update project" })
  @ApiParam({ name: "id", description: "Project UUID" })
  @Permissions("projects:update")
  update(
    @Param("id") id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.projectsService.update(id, updateProjectDto, audit);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft delete project" })
  @ApiParam({ name: "id", description: "Project UUID" })
  @Permissions("projects:delete")
  remove(
    @Param("id") id: string,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.projectsService.remove(id, audit);
  }
}
