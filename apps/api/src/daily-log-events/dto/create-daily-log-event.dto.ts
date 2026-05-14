import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsDateString,
  IsNotEmpty,
  IsString,
  IsUUID,
} from "class-validator";

export class CreateDailyLogEventDto {
  @ApiProperty({ example: "018f63f4-4937-7784-9ef5-5b51f6c02b4a" })
  @IsUUID()
  @IsNotEmpty()
  dailyLogId!: string;

  @ApiProperty({ example: "018f63f4-4937-7784-9ef5-5b51f6c02b4b" })
  @IsUUID()
  @IsNotEmpty()
  eventTypeId!: string;

  @ApiProperty({ example: "Concrete pour completed" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  activity!: string;

  @ApiProperty({ example: "Crew poured 12 m3 of concrete without incidents." })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  executionDescription!: string;

  @ApiProperty({ example: "2026-05-14T15:30:00.000Z" })
  @IsDateString()
  @IsNotEmpty()
  reportedAt!: string;
}
