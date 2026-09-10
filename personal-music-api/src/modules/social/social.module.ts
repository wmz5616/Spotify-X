import { Module } from '@nestjs/common';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MusicLibraryModule } from '../music-library/music-library.module';

@Module({
    imports: [PrismaModule, MusicLibraryModule],
    controllers: [SocialController],
    providers: [SocialService],
    exports: [SocialService],
})
export class SocialModule { }
