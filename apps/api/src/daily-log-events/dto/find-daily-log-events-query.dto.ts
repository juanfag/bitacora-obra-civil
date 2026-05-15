import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from "class-validator";

export class FindDailyLogEventsQueryDto {
  @ApiPropertyOptional({
    description: "Filter by parent DailyLog UUID.",
    example: "018f63f4-4937-7784-9ef5-5b51f6c02b4a",
  })
  @IsUUID()
  @IsOptional()
  dailyLogId?: string;

  @ApiPropertyOptional({
    description: "Filter by EventType UUID.",
    example: "018f63f4-4937-7784-9ef5-5b51f6c02b4b",
  })
  @IsUUID()
  @IsOptional()
  eventTypeId?: string;

  @ApiPropertyOptional({
    description: "Filter events reported at or after this timestamp.",
    example: "2026-05-14T00:00:00.000Z",
  })
  @IsDateString()
  @IsOptional()
  reportedFrom?: string;

  @ApiPropertyOptional({
    description: "Filter events reported at or before this timestamp.",
    example: "2026-05-14T23:59:59.999Z",
  })
  @IsDateString()
  @IsOptional()
  reportedTo?: string;

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
