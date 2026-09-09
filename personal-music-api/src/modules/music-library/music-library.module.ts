import { Module } from '@nestjs/common';
import { MusicLibraryService } from './music-library.service';
import { OnlineMusicService } from './online-music.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MusicLibraryController } from './music-library.controller';
import { StreamingModule } from '../streaming/streaming.module';

@Module({
  imports: [StreamingModule],
  controllers: [MusicLibraryController],
  providers: [MusicLibraryService, OnlineMusicService, PrismaService],
  exports: [MusicLibraryService, OnlineMusicService],
})
export class MusicLibraryModule {}

