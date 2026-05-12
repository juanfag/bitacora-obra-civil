import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { RecordStatus } from "@prisma/client";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { OrganizationsService } from "./organizations.service";

@ApiTags("organizations")
@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: "List organizations" })
  @ApiQuery({ name: "status", enum: RecordStatus, required: false })
  @ApiQuery({ name: "code", required: false })
  @ApiQuery({ name: "name", required: false })
  findAll(
    @Query("status") status?: RecordStatus,
    @Query("code") code?: string,
    @Query("name") name?: string,
  ) {
    return this.organizationsService.findAll({ status, code, name });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get organization by id" })
  @ApiParam({ name: "id", description: "Organization UUID" })
  findOne(@Param("id") id: string) {
    return this.organizationsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Create organization" })
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update organization" })
  @ApiParam({ name: "id", description: "Organization UUID" })
  update(
    @Param("id") id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft delete organization" })
  @ApiParam({ name: "id", description: "Organization UUID" })
  remove(@Param("id") id: string) {
    return this.organizationsService.remove(id);
  }
}
