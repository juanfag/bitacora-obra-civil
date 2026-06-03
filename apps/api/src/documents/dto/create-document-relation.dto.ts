import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DocumentRelationType } from "@prisma/client";
import { IsEnum, IsObject, IsOptional, IsUUID } from "class-validator";

export class CreateDocumentRelationDto {
  @ApiProperty({
    enum: DocumentRelationType,
    examples: [
      DocumentRelationType.DAILY_LOG,
      DocumentRelationType.DAILY_LOG_EVENT,
      DocumentRelationType.PROJECT,
    ],
  })
  @IsEnum(DocumentRelationType)
  relationType!: DocumentRelationType;

  @ApiPropertyOptional({ example: "018f63f4-4937-7784-9ef5-5b51f6c02b4a" })
  @IsUUID()
  @IsOptional()
  dailyLogId?: string;

  @ApiPropertyOptional({ example: "018f63f4-4937-7784-9ef5-5b51f6c02b4b" })
  @IsUUID()
  @IsOptional()
  dailyLogEventId?: string;

  @ApiPropertyOptional({ example: "018f63f4-4937-7784-9ef5-5b51f6c02b4c" })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ example: { source: "daily_log_detail" } })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
