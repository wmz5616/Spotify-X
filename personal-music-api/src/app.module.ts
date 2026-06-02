import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MusicLibraryModule } from './modules/music-library/music-library.module';
import { PrismaService } from './prisma/prisma.service';
import { StreamingModule } from './modules/streaming/streaming.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { PlayHistoryModule } from './modules/play-history/play-history.module';
import { UserPlaylistModule } from './modules/user-playlist/user-playlist.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationModule } from './modules/notification/notification.module';
import { SocialModule } from './modules/social/social.module';
import { ChatModule } from './modules/chat/chat.module';
import { AdminModule } from './modules/admin/admin.module';
import {
  WinstonModule,
  utilities as nestWinstonModuleUtilities,
} from 'nest-winston';
import * as winston from 'winston';
import * as path from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/static',
    }),

    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.ms(),
            nestWinstonModuleUtilities.format.nestLike('PersonalMusic', {
              prettyPrint: true,
              colors: true,
            }),
          ),
        }),
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'error.log'),
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
        new winston.transports.File({
          filename: path.join(process.cwd(), 'logs', 'combined.log'),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
        }),
      ],
    }),
    MusicLibraryModule,
    StreamingModule,
    AuthModule,
    UserModule,
    FavoritesModule,
    PlayHistoryModule,
    UserPlaylistModule,
    NotificationModule,
    SocialModule,
    ChatModule,
    AdminModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule { }

