import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID } from "class-validator";

export class UploadAttachmentDto {
  @ApiProperty({
    description: "DailyLogEvent UUID that owns the attachment.",
    example: "018f63f4-4937-7784-9ef5-5b51f6c02b4a",
  })
  @IsUUID()
  @IsNotEmpty()
  dailyLogEventId!: string;
}
