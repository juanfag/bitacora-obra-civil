import { Module, RequestMethod } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ConfigType } from "@nestjs/config";
import { MulterModule } from "@nestjs/platform-express";
import { ServeStaticModule } from "@nestjs/serve-static";
import { LoggerModule } from "nestjs-pino";
import { AttachmentsModule } from "./attachments/attachments.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { DailyLogsModule } from "./daily-logs/daily-logs.module";
import { DailyLogEventsModule } from "./daily-log-events/daily-log-events.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { EventTypesModule } from "./event-types/event-types.module";
import { EventsModule } from "./events/events.module";
import { HealthModule } from "./health/health.module";
import {
  createPinoHttpOptions,
  loggingConfig,
} from "./logging/logging.config";
import { OrganizationsModule } from "./organizations/organizations.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProjectsModule } from "./projects/projects.module";
import { RolesModule } from "./roles/roles.module";
import { uploadConfig } from "./uploads/upload.config";
import { createMulterFileFilter } from "./uploads/upload.validators";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ".env",
      isGlobal: true,
      load: [uploadConfig, loggingConfig],
    }),
    LoggerModule.forRootAsync({
      inject: [loggingConfig.KEY],
      useFactory: (config: ConfigType<typeof loggingConfig>) => ({
        pinoHttp: createPinoHttpOptions(config),
        forRoutes: [{ path: "{*path}", method: RequestMethod.ALL }],
      }),
    }),
    ServeStaticModule.forRootAsync({
      inject: [uploadConfig.KEY],
      useFactory: (config: ConfigType<typeof uploadConfig>) => [
        {
          rootPath: config.path,
          serveRoot: config.publicPath,
        },
      ],
    }),
    MulterModule.registerAsync({
      inject: [uploadConfig.KEY],
      useFactory: (config: ConfigType<typeof uploadConfig>) => ({
        dest: config.path,
        limits: {
          fileSize: config.maxFileSize,
        },
        fileFilter: createMulterFileFilter(config.allowedMimeTypes),
      }),
    }),
    AuditModule,
    AuthModule,
    PrismaModule,
    AttachmentsModule,
    DashboardModule,
    DailyLogEventsModule,
    DailyLogsModule,
    EventTypesModule,
    EventsModule,
    HealthModule,
    OrganizationsModule,
    ProjectsModule,
    RolesModule,
    UsersModule,
  ],
})
export class AppModule {}
