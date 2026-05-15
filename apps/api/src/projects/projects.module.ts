import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProjectAccessPolicy } from "./project-access.policy";
import { ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";

@Module({
  imports: [AuthModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectAccessPolicy],
  exports: [ProjectAccessPolicy],
})
export class ProjectsModule {}
