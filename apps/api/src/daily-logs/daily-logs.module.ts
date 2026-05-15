import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { DailyLogsController } from "./daily-logs.controller";
import { DailyLogsService } from "./daily-logs.service";
import { DailyLogWorkflowService } from "./daily-log-workflow.service";
import { DailyLogProjectAccessGuard } from "./guards/daily-log-project-access.guard";

@Module({
  imports: [AuthModule, ProjectsModule],
  controllers: [DailyLogsController],
  providers: [
    DailyLogsService,
    DailyLogWorkflowService,
    DailyLogProjectAccessGuard,
  ],
})
export class DailyLogsModule {}
