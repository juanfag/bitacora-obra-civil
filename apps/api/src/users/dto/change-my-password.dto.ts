import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class ChangeMyPasswordDto {
  @ApiProperty({ example: "Password123!" })
  @IsString()
  @MaxLength(200)
  currentPassword!: string;

  @ApiProperty({ example: "NewPassword123!" })
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  newPassword!: string;

  @ApiProperty({ example: "NewPassword123!" })
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  confirmPassword!: string;
}
