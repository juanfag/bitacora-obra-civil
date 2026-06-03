import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DocumentStatus, DocumentType, DocumentVisibility } from "@prisma/client";
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateDocumentDto {
  @ApiProperty({ example: "018f63f4-4937-7784-9ef5-5b51f6c02b4a" })
  @IsUUID()
  projectId!: string;

  @ApiPropertyOptional({ example: "018f63f4-4937-7784-9ef5-5b51f6c02b4b" })
  @IsUUID()
  @IsOptional()
  dailyLogId?: string;

  @ApiPropertyOptional({ example: "018f63f4-4937-7784-9ef5-5b51f6c02b4c" })
  @IsUUID()
  @IsOptional()
  eventId?: string;

  @ApiPropertyOptional({ example: "018f63f4-4937-7784-9ef5-5b51f6c02b4d" })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ example: "DOC-2026-001" })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  code?: string;

  @ApiProperty({ enum: DocumentType, example: DocumentType.PLANO })
  @IsEnum(DocumentType)
  type!: DocumentType;

  @ApiProperty({ example: "Plano estructural nivel 2" })
  @IsString()
  @MaxLength(250)
  title!: string;

  @ApiPropertyOptional({ example: "Plano recibido para control documental." })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: "plano-estructural-n2.pdf" })
  @IsString()
  @MaxLength(250)
  @IsOptional()
  fileName?: string;

  @ApiPropertyOptional({ example: "application/pdf" })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  mimeType?: string;

  @ApiPropertyOptional({ example: 248192, minimum: 0 })
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  @IsOptional()
  sizeBytes?: number;

  @ApiPropertyOptional({
    example:
      "f2ca1bb6c7e907d06dafe4687e579fce58f74f7761237a5f8e89e76a2ea37b5f",
  })
  @IsString()
  @Matches(/^[a-fA-F0-9]{64}$/)
  @IsOptional()
  checksumSha256?: string;

  @ApiPropertyOptional({ enum: DocumentStatus, example: DocumentStatus.ACTIVE })
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @ApiPropertyOptional({
    enum: DocumentVisibility,
    example: DocumentVisibility.PROJECT,
  })
  @IsEnum(DocumentVisibility)
  @IsOptional()
  visibility?: DocumentVisibility;

  @ApiPropertyOptional({
    example: { externalReference: "DOC-2026-001", revision: "A" },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
