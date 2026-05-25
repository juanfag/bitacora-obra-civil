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
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UploadedFile } from "../uploads/upload-file.types";
import { validateUploadFileMagicBytes } from "../uploads/upload.validators";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
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
  @ApiOperation({ summary: "List users" })
  @ApiQuery({ name: "status", enum: RecordStatus, required: false })
  @ApiQuery({ name: "email", required: false })
  @ApiQuery({ name: "fullName", required: false })
  @ApiQuery({ name: "documentNumber", required: false })
  findAll(
    @Query("status") status?: RecordStatus,
    @Query("email") email?: string,
    @Query("fullName") fullName?: string,
    @Query("documentNumber") documentNumber?: string,
  ) {
    return this.usersService.findAll({
      status,
      email,
      fullName,
      documentNumber,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get user by id" })
  @ApiParam({ name: "id", description: "User UUID" })
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
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
