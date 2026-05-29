import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { DocumentStatus } from "@prisma/client";
import { IsEnum, IsOptional } from "class-validator";
import { CreateDocumentDto } from "./create-document.dto";

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {
  @ApiPropertyOptional({ enum: DocumentStatus, example: DocumentStatus.ARCHIVED })
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;
}
