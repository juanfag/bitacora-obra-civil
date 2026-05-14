import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RecordStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateOrganizationDto {
  @ApiProperty({ example: "Constructora Demo S.A.S" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: "900123456-7" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsOptional()
  nit?: string;

  @ApiPropertyOptional({ example: "contacto@demo.com" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: "3001234567" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ enum: RecordStatus, example: RecordStatus.ACTIVE })
  @IsEnum(RecordStatus)
  @IsOptional()
  status?: RecordStatus;
}
