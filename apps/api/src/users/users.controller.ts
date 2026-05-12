import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { RecordStatus } from "@prisma/client";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
