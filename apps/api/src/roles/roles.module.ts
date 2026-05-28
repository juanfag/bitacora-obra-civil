import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma/prisma.module";
import { ProjectsModule } from "../projects/projects.module";
import { RolesController } from "./roles.controller";
import { RolesService } from "./roles.service";

@Module({
  imports: [AuthModule, PrismaModule, ProjectsModule],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
