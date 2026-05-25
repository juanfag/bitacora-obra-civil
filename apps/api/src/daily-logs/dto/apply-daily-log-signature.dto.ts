import { ApiProperty } from "@nestjs/swagger";
import { DailyLogSignatureType } from "@prisma/client";
import { IsEnum } from "class-validator";

export class ApplyDailyLogSignatureDto {
  @ApiProperty({
    enum: DailyLogSignatureType,
    description: "Role/type of the signature being applied to the daily log.",
  })
  @IsEnum(DailyLogSignatureType)
  signatureType!: DailyLogSignatureType;
}
