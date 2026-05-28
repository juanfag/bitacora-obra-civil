import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserStatus } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateUserStatusDto {
  @ApiProperty({ enum: UserStatus, example: UserStatus.BLOCKED })
  @IsEnum(UserStatus)
  status!: UserStatus;

  @ApiPropertyOptional({
    example: "Multiple failed access attempts.",
    maxLength: 500,
  })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  @IsOptional()
  reason?: string;
}
