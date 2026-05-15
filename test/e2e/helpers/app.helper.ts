import { INestApplication, RequestMethod, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../../../apps/api/src/app.module";
import { PrismaService } from "../../../apps/api/src/prisma/prisma.service";

export type SmokeTestApp = {
  app: INestApplication;
  prisma: PrismaService;
};

export async function createSmokeTestApp(): Promise<SmokeTestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication({
    logger: false,
  });

  app.setGlobalPrefix("api/v1", {
    exclude: [
      { path: "swagger", method: RequestMethod.ALL },
      { path: "swagger/{*path}", method: RequestMethod.ALL },
    ],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  return {
    app,
    prisma: app.get(PrismaService),
  };
}
