import * as crypto from 'crypto';
if (!globalThis.crypto) {
  (globalThis as any).crypto = crypto;
}
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const express = require('express');
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const logger = new Logger('Bootstrap');

  const config = new DocumentBuilder()
    .setTitle('Personal Music Cloud API')
    .setDescription(
      `Personal Music Cloud 后端 API 文档
    
## 功能概述
- 🎵 音乐库扫描与管理
- 💽 专辑和歌曲信息查询
- 🎤 艺术家信息管理
- 📋 播放列表 CRUD
- 🔍 全局搜索
- 🎧 音频流媒体

## 认证
所有 API 请求需要通过 \`x-api-key\` Header 传递 API Key，
或通过 URL 参数 \`?key=YOUR_API_KEY\` 进行认证。
    `,
    )
    .setVersion('1.0')
    .addApiKey(
      { type: 'apiKey', name: 'x-api-key', in: 'header' },
      'api-key',
    )
    .addTag('Library', '音乐库扫描与管理')
    .addTag('Albums', '专辑相关接口')
    .addTag('Artists', '艺术家相关接口')
    .addTag('Songs', '歌曲相关接口')
    .addTag('Playlists', '播放列表管理')
    .addTag('Search', '搜索功能')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'Personal Music Cloud API',
    customfavIcon: '/favicon.ico',
    customCss: '.swagger-ui .topbar { display: none }',
  });
  logger.log('Swagger API documentation available at /api-docs');

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  app.enableCors({
    origin: corsOrigin.includes(',') ? corsOrigin.split(',') : corsOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  });

  const publicPath = join(process.cwd(), 'public');
  logger.log(`Static assets path configured: ${publicPath}`);

  app.useStaticAssets(publicPath, {
    prefix: '/public/',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`CORS allowed origin: ${corsOrigin}`);
}
bootstrap();
