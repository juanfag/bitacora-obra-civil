import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "juan.agudelo@bitacora.local" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: "Password123!",
    description:
      "Pending enablement until User.passwordHash is added through a controlled migration.",
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
