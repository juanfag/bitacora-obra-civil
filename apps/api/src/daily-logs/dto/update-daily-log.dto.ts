import { OmitType, PartialType } from "@nestjs/swagger";
import { CreateDailyLogDto } from "./create-daily-log.dto";

export class UpdateDailyLogDto extends PartialType(
  OmitType(CreateDailyLogDto, ["status"] as const),
) {}
