import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DailyLogsController } from "./daily-logs.controller";
import { DailyLogsService } from "./daily-logs.service";

@Module({
  imports: [AuthModule],
  controllers: [DailyLogsController],
  providers: [DailyLogsService],
})
export class DailyLogsModule {}
