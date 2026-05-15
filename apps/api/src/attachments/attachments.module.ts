import { Module } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { MulterModule } from "@nestjs/platform-express";
import { AuthModule } from "../auth/auth.module";
import { ProjectsModule } from "../projects/projects.module";
import { uploadConfig } from "../uploads/upload.config";
import { createMulterFileFilter } from "../uploads/upload.validators";
import { AttachmentsController } from "./attachments.controller";
import { AttachmentsService } from "./attachments.service";

@Module({
  imports: [
    AuthModule,
    ProjectsModule,
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
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}
