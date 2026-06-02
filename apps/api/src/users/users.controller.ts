import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
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
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { UserStatus } from "@prisma/client";
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
import { ChangeMyPasswordDto } from "./dto/change-my-password.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { ResetUserPasswordDto } from "./dto/reset-user-password.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
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

  @Patch("me/password")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Change current user's password" })
  @ApiOkResponse({ description: "Password changed and sessions invalidated." })
  @ApiBadRequestResponse({ description: "Invalid password payload." })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
  @UseGuards(JwtAuthGuard)
  changeMyPassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() changeMyPasswordDto: ChangeMyPasswordDto,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.usersService.changeMyPassword(user.sub, changeMyPasswordDto, {
      ...audit,
      actorId: user.sub,
    });
  }

  @Get("me/permissions")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get current user's effective permission codes for UI visibility",
  })
  @ApiOkResponse({ description: "Effective permission codes returned." })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
  @UseGuards(JwtAuthGuard)
  getMyPermissions(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getMyPermissions(user.sub);
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
  @ApiQuery({ name: "status", enum: UserStatus, required: false })
  @ApiQuery({ name: "email", required: false })
  @ApiQuery({ name: "fullName", required: false })
  @ApiQuery({ name: "documentNumber", required: false })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("users:read")
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query("status") status?: UserStatus,
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
  @Permissions("users:read")
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
  @ApiConflictResponse({
    description:
      "The role change is not allowed because it would remove the last active administrator in its scope.",
  })
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

  @Patch(":id/status")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update user status" })
  @ApiOkResponse({
    description: "User status updated.",
    type: UserReadDto,
  })
  @ApiBadRequestResponse({ description: "Invalid status payload." })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
  @ApiForbiddenResponse({ description: "Insufficient permissions." })
  @ApiNotFoundResponse({ description: "User not found." })
  @ApiConflictResponse({
    description:
      "The status change is not allowed because it would remove the last active administrator.",
  })
  @ApiParam({ name: "id", description: "User UUID" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(
    "users:update",
    "users:manage",
    "organizations:update",
    "organizations:create",
  )
  updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.usersService.updateStatus(id, updateUserStatusDto, user.sub, {
      ...audit,
      actorId: user.sub,
    });
  }

  @Post(":id/invalidate-sessions")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Invalidate all active sessions for a user" })
  @ApiOkResponse({
    description: "User sessions invalidated.",
    type: UserReadDto,
  })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
  @ApiForbiddenResponse({ description: "Insufficient permissions." })
  @ApiNotFoundResponse({ description: "User not found." })
  @ApiParam({ name: "id", description: "User UUID" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(
    "users:update",
    "users:manage",
    "organizations:update",
    "organizations:create",
  )
  @HttpCode(200)
  invalidateSessions(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.usersService.invalidateSessions(id, user.sub, {
      ...audit,
      actorId: user.sub,
    });
  }

  @Patch(":id/password")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Reset another user's password" })
  @ApiOkResponse({
    description: "Password reset and sessions invalidated.",
    type: UserReadDto,
  })
  @ApiBadRequestResponse({ description: "Invalid password payload." })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
  @ApiForbiddenResponse({ description: "Insufficient permissions." })
  @ApiNotFoundResponse({ description: "User not found." })
  @ApiParam({ name: "id", description: "User UUID" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("users:update", "users:password:reset", "users:manage")
  resetPassword(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() resetUserPasswordDto: ResetUserPasswordDto,
    @AuditContext() audit: AuditRequestContext,
  ) {
    return this.usersService.resetPassword(id, resetUserPasswordDto, user.sub, {
      ...audit,
      actorId: user.sub,
    });
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create user" })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
  @ApiForbiddenResponse({ description: "Insufficient permissions." })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("users:create", "users:manage")
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update user" })
  @ApiParam({ name: "id", description: "User UUID" })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
  @ApiForbiddenResponse({ description: "Insufficient permissions." })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("users:update", "users:manage")
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Soft delete user" })
  @ApiParam({ name: "id", description: "User UUID" })
  @ApiUnauthorizedResponse({ description: "Missing, invalid, or expired JWT." })
  @ApiForbiddenResponse({ description: "Insufficient permissions." })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions("users:delete", "users:manage")
  remove(@Param("id") id: string) {
    return this.usersService.remove(id);
  }
}
