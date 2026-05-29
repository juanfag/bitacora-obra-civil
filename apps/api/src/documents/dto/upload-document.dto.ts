import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DocumentType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class UploadDocumentDto {
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

  @ApiProperty({ enum: DocumentType, example: DocumentType.ACTA })
  @IsEnum(DocumentType)
  type!: DocumentType;

  @ApiProperty({ example: "Acta de comite de obra" })
  @IsString()
  @MaxLength(250)
  title!: string;

  @ApiPropertyOptional({ example: "Documento cargado para control documental." })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "JSON string with optional document metadata.",
    example: "{\"revision\":\"A\",\"externalReference\":\"DOC-001\"}",
  })
  @IsString()
  @MaxLength(4000)
  @IsOptional()
  metadata?: string;
}
