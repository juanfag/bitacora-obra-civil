import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DailyLogsController } from "./daily-logs.controller";
import { DailyLogsService } from "./daily-logs.service";
import { DailyLogWorkflowService } from "./daily-log-workflow.service";

@Module({
  imports: [AuthModule],
  controllers: [DailyLogsController],
  providers: [DailyLogsService, DailyLogWorkflowService],
})
export class DailyLogsModule {}
