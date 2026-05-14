import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const port = Number(process.env.PORT ?? 3000);
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));

  app.enableCors();
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'swagger', method: RequestMethod.ALL },
      { path: 'swagger/{*path}', method: RequestMethod.ALL },
    ],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Bitacora de Obra API')
    .setDescription('API backend para la gestion de bitacoras diarias de obra civil')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document, {
    useGlobalPrefix: false,
  });

  await app.listen(port, '0.0.0.0');

  const appUrl = await app.getUrl();
  console.log(`API escuchando en: ${appUrl}`);
  console.log(`Swagger disponible en: http://localhost:${port}/swagger`);
}

bootstrap().catch((error) => {
  console.error('Error al iniciar la API:', error);
});
