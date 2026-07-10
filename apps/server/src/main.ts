import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TransformInterceptor } from './shared/interceptors/response.interceptor';
import { TimeoutInterceptor } from './shared/interceptors/error.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new TimeoutInterceptor(),
  );

  app.setGlobalPrefix('api');

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port');
  const corsOrigin = configService.get<string>('corsOrigin');
  const enableSwagger = configService.get<boolean>('enableSwagger');

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      stopAtFirstError: true,
      transform: true,
    }),
  );

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle('Repin')
      .setDescription('Repin API')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }
  await app.listen(port, () => {
    Logger.log(`App is currently running on port - ${port}`);
  });
}
bootstrap();
