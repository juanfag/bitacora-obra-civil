import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RecordStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

export class CreateUserDto {
  @ApiProperty({ example: "Admin Demo" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ example: "admin.demo@bitacora.local" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ example: "3000000000" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: "CC" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsOptional()
  documentType?: string;

  @ApiPropertyOptional({ example: "1000000000" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsOptional()
  documentNumber?: string;

  @ApiPropertyOptional({ enum: RecordStatus, example: RecordStatus.ACTIVE })
  @IsEnum(RecordStatus)
  @IsOptional()
  status?: RecordStatus;

  @ApiPropertyOptional({
    example: "Password123!",
    description:
      "Optional during initial setup. When provided, it is stored only as a bcrypt hash.",
  })
  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;
}
