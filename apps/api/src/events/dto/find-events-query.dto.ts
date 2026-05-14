import { ApiPropertyOptional } from "@nestjs/swagger";
import { EventStatus } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class FindEventsQueryDto {
  @ApiPropertyOptional({ example: "018f63f4-4937-7784-9ef5-5b51f6c02b4a" })
  @IsUUID()
  @IsOptional()
  dailyLogId?: string;

  @ApiPropertyOptional({ example: "018f63f4-4937-7784-9ef5-5b51f6c02b4b" })
  @IsUUID()
  @IsOptional()
  eventTypeId?: string;

  @ApiPropertyOptional({ enum: EventStatus, example: EventStatus.DRAFT })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @ApiPropertyOptional({ example: "2026-05-12T00:00:00.000Z" })
  @IsDateString()
  @IsOptional()
  reportedFrom?: string;

  @ApiPropertyOptional({ example: "2026-05-13T00:00:00.000Z" })
  @IsDateString()
  @IsOptional()
  reportedTo?: string;

  @ApiPropertyOptional({ example: 1, minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
