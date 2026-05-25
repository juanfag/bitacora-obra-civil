import { Module } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { MulterModule } from "@nestjs/platform-express";
import { AuthModule } from "../auth/auth.module";
import { uploadConfig } from "../uploads/upload.config";
import { createMulterFileFilter } from "../uploads/upload.validators";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [
    AuthModule,
    MulterModule.registerAsync({
      inject: [uploadConfig.KEY],
      useFactory: (config: ConfigType<typeof uploadConfig>) => ({
        dest: config.path,
        limits: {
          fileSize: Math.min(config.maxFileSize, 1024 * 1024),
        },
        fileFilter: createMulterFileFilter(["image/jpeg", "image/png"]),
      }),
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
