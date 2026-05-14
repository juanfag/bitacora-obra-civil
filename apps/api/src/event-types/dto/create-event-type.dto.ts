import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { AttachmentRequirement, RecordStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateEventTypeDto {
  @ApiProperty({ example: "WORK_PROGRESS" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: "Avance de obra" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: "Evento para registrar avance diario de obra." })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: AttachmentRequirement,
    example: AttachmentRequirement.OPTIONAL,
  })
  @IsEnum(AttachmentRequirement)
  @IsOptional()
  attachmentRequirement?: AttachmentRequirement;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  requiresSignature?: boolean;

  @ApiPropertyOptional({ enum: RecordStatus, example: RecordStatus.ACTIVE })
  @IsEnum(RecordStatus)
  @IsOptional()
  status?: RecordStatus;
}
