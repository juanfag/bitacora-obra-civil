import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { DailyLogEventsController } from "./daily-log-events.controller";
import { DailyLogEventsService } from "./daily-log-events.service";

@Module({
  imports: [AuthModule, ProjectsModule],
  controllers: [DailyLogEventsController],
  providers: [DailyLogEventsService],
})
export class DailyLogEventsModule {}
