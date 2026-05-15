import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";

export class RejectDailyLogDto {
  @ApiProperty({
    description: "Reviewer comment explaining why the daily log was rejected.",
    example: "Missing required event evidence.",
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  comment!: string;
}
