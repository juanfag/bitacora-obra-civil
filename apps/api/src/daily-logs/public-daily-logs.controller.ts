import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { DailyLogPdfService } from "./daily-log-pdf.service";

@ApiTags("public-daily-logs")
@Controller()
export class PublicDailyLogsController {
  constructor(private readonly dailyLogPdfService: DailyLogPdfService) {}

  @Get("daily-logs/:id/verification")
  @ApiOperation({ summary: "Public daily log document verification" })
  @ApiParam({ name: "id", description: "Daily log UUID" })
  @ApiQuery({
    name: "code",
    required: true,
    description: "Short verification code printed in the PDF.",
  })
  @ApiOkResponse({
    description: "Public daily log document verification result returned.",
  })
  @ApiBadRequestResponse({ description: "Verification code is required." })
  @ApiNotFoundResponse({ description: "Daily log not found." })
  verifyDocument(
    @Param("id") id: string,
    @Query("code") code: string | undefined,
  ) {
    return this.dailyLogPdfService.verifyPublicDocumentCode(id, code);
  }

  @Get("public/daily-logs/:id/verification")
  @ApiOperation({ summary: "Public daily log document verification" })
  @ApiParam({ name: "id", description: "Daily log UUID" })
  @ApiQuery({
    name: "code",
    required: true,
    description: "Short verification code printed in the PDF.",
  })
  @ApiOkResponse({
    description: "Public daily log document verification result returned.",
  })
  @ApiBadRequestResponse({ description: "Verification code is required." })
  @ApiNotFoundResponse({ description: "Daily log not found." })
  verifyPublicDocument(
    @Param("id") id: string,
    @Query("code") code: string | undefined,
  ) {
    return this.dailyLogPdfService.verifyPublicDocumentCode(id, code);
  }
}
