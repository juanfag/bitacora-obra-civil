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
  @ApiProperty({ example: "018f63f4-4937-7784-9ef5-5b51f6c02b4a" })
  @IsUUID()
  @IsNotEmpty()
  projectId!: string;

  @ApiProperty({ example: "2026-05-12" })
  @IsDateString()
  @IsNotEmpty()
  logDate!: string;

  @ApiPropertyOptional({
    enum: DAILY_LOG_STATUSES,
    example: DailyLogStatus.DRAFT,
  })
  @IsEnum(DAILY_LOG_STATUSES)
  @IsOptional()
  status?: (typeof DAILY_LOG_STATUSES)[number];

  @ApiPropertyOptional({ example: "Daily site progress notes." })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsOptional()
  comments?: string;
}
