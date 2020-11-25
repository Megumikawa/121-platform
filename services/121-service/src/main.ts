import { NestFactory } from '@nestjs/core';
import { ApplicationModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { PORT, BASE_PATH, SCHEME } from './config';
import * as bodyParser from 'body-parser';

const appInsights = require('applicationinsights');

async function bootstrap(): Promise<void> {
  const appOptions = { cors: true };
  const app = await NestFactory.create(ApplicationModule, appOptions);
  app.setGlobalPrefix('api');

  const options = new DocumentBuilder()
    .setTitle('121 - Programs-Service')
    .setDescription('API description')
    .setVersion('1.0')
    .setBasePath(BASE_PATH)
    .setSchemes(SCHEME)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);

  SwaggerModule.setup('/docs', app, document);
  app.useGlobalPipes(new ValidationPipe());
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
  await app.listen(PORT);
}
bootstrap();

appInsights.setup(process.env.APPLICATION_INSIGHT_IKEY);
appInsights.start();
