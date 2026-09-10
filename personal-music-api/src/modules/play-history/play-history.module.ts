import { Module } from '@nestjs/common';
import { PlayHistoryService } from './play-history.service';
import { PlayHistoryController } from './play-history.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationModule } from '../notification/notification.module';
import { MusicLibraryModule } from '../music-library/music-library.module';

@Module({
    imports: [NotificationModule, MusicLibraryModule],
    controllers: [PlayHistoryController],
    providers: [PlayHistoryService, PrismaService],
    exports: [PlayHistoryService],
})
export class PlayHistoryModule { }
