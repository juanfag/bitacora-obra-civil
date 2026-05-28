import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile as UploadedFileDecorator,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { RecordStatus } from "@prisma/client";
import { AuditRequestContext } from "../audit/audit.types";
import { AuditContext } from "../audit/decorators/audit-context.decorator";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../auth/decorators/current-user.decorator";
import { Permissions } from "../auth/decorators/permissions.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { UploadedFile } from "../uploads/upload-file.types";
import { validateUploadFileMagicBytes } from "../uploads/upload.validators";
import { AssignUserRolesDto } from "./dto/assign-user-roles.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import {
  UserReadDto,
  UsersReadListResponseDto,
} from "./dto/user-read-response.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me/signature")
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
  @ApiOperation({ summary: "Get current user's master signature" })
  @UseGuards(JwtAuthGuard)
  getMySignature(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getMySignature(user.sub);
  }

  @Post("me/signature")
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
  @ApiOperation({ summary: "Upload or replace current user's master signature" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  async uploadMySignature(
    @UploadedFileDecorator() file: UploadedFile | undefined,
    @CurrentUser() user: CurrentUserPayload,
    @AuditContext() audit: AuditRequestContext,
  ) {
    const uploadedFile = file as UploadedFile;

    if (!uploadedFile) {
      throw new BadRequestException("Signature file is required.");
    }

    try {
      await validateUploadFileMagicBytes(uploadedFile);
    } catch (error) {
      await this.usersService.discardUploadedSignatureFile(uploadedFile.path);
      throw error;
    }

    return this.usersService.uploadMySignature(user.sub, uploadedFile, {
      ...audit,
      actorId: user.sub,
    });
  }

  @Delete("me/signature")
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
  @ApiOperation({ summary: "Delete current user's master signature" })
  @UseGuards(JwtAuthGuard)
  deleteMySignature(
    @CurrentUser() user: CurrentUserPayload,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.usersService.deleteMySignature(user.sub, {
      ...audit,
      actorId: user.sub,
    });
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: "List users" })
  @ApiOkResponse({
    description: "Users returned.",
    type: UsersReadListResponseDto,
  })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
  @ApiForbiddenResponse({ description: "Insufficient permissions." })
  @ApiQuery({ name: "status", enum: RecordStatus, required: false })
  @ApiQuery({ name: "email", required: false })
  @ApiQuery({ name: "fullName", required: false })
  @ApiQuery({ name: "documentNumber", required: false })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("users:read", "organizations:read")
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query("status") status?: RecordStatus,
    @Query("email") email?: string,
    @Query("fullName") fullName?: string,
    @Query("documentNumber") documentNumber?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.usersService.findAll({
      currentUserId: user.sub,
      status,
      email,
      fullName,
      documentNumber,
      search,
      page,
      limit,
    });
  }

  @Get(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get user by id" })
  @ApiOkResponse({
    description: "User returned.",
    type: UserReadDto,
  })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
  @ApiForbiddenResponse({ description: "Insufficient permissions." })
  @ApiParam({ name: "id", description: "User UUID" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("users:read", "organizations:read")
  findOne(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.usersService.findOne(id, user.sub);
  }

  @Patch(":id/roles")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Assign roles to a user" })
  @ApiOkResponse({
    description: "User roles updated.",
    type: UserReadDto,
  })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
  @ApiForbiddenResponse({ description: "Insufficient permissions." })
  @ApiParam({ name: "id", description: "User UUID" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("users:manage", "organizations:update", "organizations:create")
  updateRoles(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() assignUserRolesDto: AssignUserRolesDto,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.usersService.updateRoles(id, assignUserRolesDto, user.sub, {
      ...audit,
      actorId: user.sub,
    });
  }

  @Post()
  @ApiOperation({ summary: "Create user" })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update user" })
  @ApiParam({ name: "id", description: "User UUID" })
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Soft delete user" })
  @ApiParam({ name: "id", description: "User UUID" })
  remove(@Param("id") id: string) {
    return this.usersService.remove(id);
  }
}
