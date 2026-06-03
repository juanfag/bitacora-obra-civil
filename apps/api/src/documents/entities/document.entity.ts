import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DocumentStatus, DocumentType, DocumentVisibility } from "@prisma/client";

export class DocumentEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  projectId!: string;

  @ApiPropertyOptional()
  dailyLogId!: string | null;

  @ApiPropertyOptional()
  eventId!: string | null;

  @ApiPropertyOptional()
  categoryId!: string | null;

  @ApiPropertyOptional()
  code!: string | null;

  @ApiProperty({ enum: DocumentType })
  type!: DocumentType;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiProperty()
  fileName!: string;

  @ApiPropertyOptional()
  mimeType!: string | null;

  @ApiPropertyOptional()
  sizeBytes!: number | null;

  @ApiProperty({ enum: DocumentStatus })
  status!: DocumentStatus;

  @ApiProperty({ enum: DocumentVisibility })
  visibility!: DocumentVisibility;

  @ApiPropertyOptional()
  metadata!: Record<string, unknown> | null;

  @ApiProperty()
  uploadedById!: string;

  @ApiPropertyOptional()
  createdById!: string | null;

  @ApiPropertyOptional()
  updatedById!: string | null;

  @ApiPropertyOptional()
  deletedById!: string | null;

  @ApiPropertyOptional()
  uploadedBy!: {
    id: string;
    fullName: string;
    email: string;
  } | null;

  @ApiPropertyOptional()
  category!: {
    id: string;
    code: string;
    name: string;
  } | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional()
  deletedAt!: Date | null;
}
