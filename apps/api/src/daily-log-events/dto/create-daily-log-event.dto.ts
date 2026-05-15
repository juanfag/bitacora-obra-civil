import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsDateString,
  IsNotEmpty,
  IsString,
  IsUUID,
} from "class-validator";

export class CreateDailyLogEventDto {
  @ApiProperty({
    description: "Parent DailyLog UUID. Parent DailyLog must be editable.",
    example: "018f63f4-4937-7784-9ef5-5b51f6c02b4a",
  })
  @IsUUID()
  @IsNotEmpty()
  dailyLogId!: string;

  @ApiProperty({
    description: "EventType catalog UUID.",
    example: "018f63f4-4937-7784-9ef5-5b51f6c02b4b",
  })
  @IsUUID()
  @IsNotEmpty()
  eventTypeId!: string;

  @ApiProperty({
    description: "Short activity title.",
    example: "Concrete pour completed",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  activity!: string;

  @ApiProperty({
    description: "Detailed execution description.",
    example: "Crew poured 12 m3 of concrete without incidents.",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  executionDescription!: string;

  @ApiProperty({
    description: "Date and time when the event was reported.",
    example: "2026-05-14T15:30:00.000Z",
  })
  @IsDateString()
  @IsNotEmpty()
  reportedAt!: string;
}
