import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { DailyLogsController } from "./daily-logs.controller";
import { DailyLogPdfService } from "./daily-log-pdf.service";
import { DailyLogsService } from "./daily-logs.service";
import { DailyLogWorkflowService } from "./daily-log-workflow.service";
import { DailyLogProjectAccessGuard } from "./guards/daily-log-project-access.guard";

@Module({
  imports: [AuthModule, ProjectsModule],
  controllers: [DailyLogsController],
  providers: [
    DailyLogPdfService,
    DailyLogsService,
    DailyLogWorkflowService,
    DailyLogProjectAccessGuard,
  ],
})
export class DailyLogsModule {}
