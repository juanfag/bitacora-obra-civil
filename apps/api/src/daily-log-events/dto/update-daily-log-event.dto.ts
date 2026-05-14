import { PartialType } from "@nestjs/swagger";
import { CreateDailyLogEventDto } from "./create-daily-log-event.dto";

export class UpdateDailyLogEventDto extends PartialType(
  CreateDailyLogEventDto,
) {}
