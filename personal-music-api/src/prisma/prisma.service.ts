import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    try {
      await this.album.count();
    } catch (e: any) {
      if (e?.code === 'P2021' || e?.message?.includes('does not exist')) {
        this.logger.warn(
          'Database tables not found. Automatically initializing schema via prisma db push...',
        );
        try {
          execSync('npx prisma db push --skip-generate --accept-data-loss', {
            stdio: 'inherit',
            cwd: process.cwd(),
          });
          this.logger.log('Database schema successfully initialized.');
        } catch (pushErr) {
          this.logger.error('Failed to run prisma db push:', pushErr);
        }
      } else {
        this.logger.error('Unexpected error checking database:', e);
      }
    }
  }
}

