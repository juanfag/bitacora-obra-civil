import { Body, Controller, Post } from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @ApiOperation({
    summary: "Login user",
    description: "Authenticates an active user with email and password.",
  })
  @ApiUnauthorizedResponse({
    description: "Email or password is invalid.",
  })
  @ApiForbiddenResponse({
    description: "User is inactive.",
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
