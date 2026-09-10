import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from '../notification/notification.service';
import { OnlineMusicService } from '../music-library/online-music.service';

@Injectable()
export class PlayHistoryService {
    private readonly logger = new Logger(PlayHistoryService.name);

    constructor(
        private prisma: PrismaService,
        private notificationService: NotificationService,
        private onlineMusicService: OnlineMusicService,
    ) { }

    @Cron('0 14 * * *')
    async handleDailyReport() {
        this.logger.log('Running daily listening report...');

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setHours(23, 59, 59, 999);

        const users = await this.prisma.user.findMany({ select: { id: true, username: true } });

        for (const user of users) {
            const history = await this.prisma.playHistory.findMany({
                where: {
                    userId: user.id,
                    playedAt: {
                        gte: yesterday,
                        lte: endOfYesterday
                    }
                },
                select: { duration: true }
            });

            const totalSeconds = history.reduce((acc, curr) => acc + (curr.duration || 0), 0);

            if (totalSeconds > 0) {
                const minutes = Math.floor(totalSeconds / 60);
                const message = `昨天你一共听了 ${minutes} 分钟的音乐，继续保持！`;

                await this.notificationService.create(
                    user.id,
                    '昨日听歌报告',
                    message,
                    'success'
                );
                this.logger.log(`Sent daily report to user ${user.id}: ${minutes} mins`);
            }
        }
    }

    private async populateHistorySongs(items: any[]) {
        const songIds = items.map((h) => Number(h.songId));
        let songMap = new Map();
        if (songIds.length > 0) {
            const localSongs = await this.prisma.song.findMany({
                where: { id: { in: songIds } },
                include: {
                    album: {
                        include: {
                            artists: true,
                        },
                    },
                },
            });
            for (const s of localSongs) {
                songMap.set(s.id, s);
            }

            const missingIds = songIds.filter((id) => !songMap.has(id));
            if (missingIds.length > 0) {
                await Promise.all(
                    missingIds.map(async (id) => {
                        try {
                            const onlineSong = await this.onlineMusicService.findSongById(id);
                            if (onlineSong) {
                                songMap.set(id, onlineSong);
                            }
                        } catch (e) {
                            // ignore
                        }
                    }),
                );
            }
        }

        return items.map((h) => {
            const song = songMap.get(Number(h.songId)) || {
                id: Number(h.songId),
                title: '未知歌曲',
                artist: '未知歌手',
                duration: h.duration || 0,
            };
            return {
                ...song,
                id: Number(h.songId),
                playedAt: h.playedAt,
                playDuration: h.duration,
                completed: h.completed,
                historyId: h.id,
            };
        });
    }

    async recordPlay(
        userId: number,
        songId: number,
        duration?: number,
        completed?: boolean,
    ) {
        const bSongId = BigInt(songId);
        const record = await this.prisma.$transaction(async (tx) => {
            await tx.playHistory.deleteMany({
                where: { userId, songId: bSongId as any },
            });

            return tx.playHistory.create({
                data: {
                    userId,
                    songId: bSongId as any,
                    duration,
                    completed: completed ?? false,
                },
            });
        });

        this.logger.log(`记录播放: userId=${userId}, songId=${songId}`);

        const count = await this.prisma.playHistory.count({ where: { userId } });
        if (count > 200) {
            const toDelete = await this.prisma.playHistory.findMany({
                where: { userId },
                orderBy: { playedAt: 'asc' },
                take: count - 200,
                select: { id: true },
            });

            await this.prisma.playHistory.deleteMany({
                where: { id: { in: toDelete.map((r) => r.id) } },
            });

            this.logger.log(`清理旧播放记录: userId=${userId}, deleted=${toDelete.length}`);
        }

        return {
            ...record,
            songId: Number(record.songId),
        };
    }

    async getHistory(userId: number, limit: number = 50, offset: number = 0) {
        const [history, total] = await Promise.all([
            this.prisma.playHistory.findMany({
                where: { userId },
                orderBy: { playedAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.playHistory.count({ where: { userId } }),
        ]);

        const items = await this.populateHistorySongs(history);

        return {
            items,
            total,
            limit,
            offset,
        };
    }

    async getRecentlyPlayed(userId: number, limit: number = 20) {
        const history = await this.prisma.playHistory.findMany({
            where: { userId },
            orderBy: { playedAt: 'desc' },
            take: limit,
        });

        return this.populateHistorySongs(history);
    }

    async clearHistory(userId: number) {
        await this.prisma.playHistory.deleteMany({
            where: { userId },
        });

        this.logger.log(`清空播放历史: userId=${userId}`);
        return { message: '播放历史已清空' };
    }

    async deleteHistoryItem(userId: number, historyId: number) {
        await this.prisma.playHistory.deleteMany({
            where: { id: historyId, userId },
        });

        return { message: '已删除' };
    }
}
