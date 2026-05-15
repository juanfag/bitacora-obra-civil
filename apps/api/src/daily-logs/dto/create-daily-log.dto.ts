import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DailyLogStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

export const DAILY_LOG_STATUSES = [
  DailyLogStatus.DRAFT,
  DailyLogStatus.IN_REVIEW,
  DailyLogStatus.APPROVED,
  DailyLogStatus.REJECTED,
  DailyLogStatus.CLOSED,
] as const;

export class CreateDailyLogDto {
  @ApiProperty({
    description: "Project UUID that owns the daily log.",
    example: "018f63f4-4937-7784-9ef5-5b51f6c02b4a",
  })
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @ApiProperty({
    description: "Work date for the daily log. Only one daily log is allowed per project and date.",
    example: "2026-05-12",
  })
  @IsDateString()
  @IsNotEmpty()
  logDate!: string;

  @ApiPropertyOptional({
    description:
      "Deprecated input. Creation always persists the daily log as DRAFT for workflow safety.",
    enum: DAILY_LOG_STATUSES,
    example: DailyLogStatus.DRAFT,
    deprecated: true,
  })
  @IsEnum(DAILY_LOG_STATUSES)
  @IsOptional()
  status?: (typeof DAILY_LOG_STATUSES)[number];

  @ApiPropertyOptional({
    description: "Optional general notes for the work date.",
    example: "Daily site progress notes.",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsOptional()
  comments?: string;
}
