import { ApiPropertyOptional } from "@nestjs/swagger";
import { DailyLogStatus } from "@prisma/client";
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
import { DAILY_LOG_STATUSES } from "./create-daily-log.dto";

export class FindDailyLogsQueryDto {
  @ApiPropertyOptional({
    description: "Filter by project UUID.",
    example: "018f63f4-4937-7784-9ef5-5b51f6c02b4a",
  })
  @IsUUID()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({
    description: "Filter by exact work date.",
    example: "2026-05-12",
  })
  @IsDateString()
  @IsOptional()
  logDate?: string;

  @ApiPropertyOptional({
    description: "Filter by current DailyLog workflow status.",
    enum: DAILY_LOG_STATUSES,
    example: DailyLogStatus.DRAFT,
  })
  @IsEnum(DAILY_LOG_STATUSES)
  @IsOptional()
  status?: (typeof DAILY_LOG_STATUSES)[number];

  @ApiPropertyOptional({
    description: "Page number.",
    example: 1,
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Page size.",
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
