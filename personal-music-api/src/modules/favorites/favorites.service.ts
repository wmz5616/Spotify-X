import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OnlineMusicService } from '../music-library/online-music.service';

@Injectable()
export class FavoritesService {
    private readonly logger = new Logger(FavoritesService.name);

    constructor(
        private prisma: PrismaService,
        private onlineMusicService: OnlineMusicService,
    ) { }

    async getFavoriteSongs(userId: number) {
        const favorites = await this.prisma.favoriteSong.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        const songIds = favorites.map((f) => Number(f.songId));
        const songMap = new Map<number, any>();

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
                        } catch {
                            // ignore
                        }
                    }),
                );
            }
        }

        return favorites.map((f) => {
            const numId = Number(f.songId);
            const song = songMap.get(numId) || {
                id: numId,
                title: '未知歌曲',
                artist: '未知歌手',
                duration: 0,
            };
            return {
                ...song,
                id: numId,
                favoritedAt: f.createdAt,
            };
        });
    }

    async toggleFavoriteSong(userId: number, songId: number) {
        const bSongId = BigInt(songId);
        const existing = await this.prisma.favoriteSong.findUnique({
            where: { userId_songId: { userId, songId: bSongId } },
        });

        if (existing) {
            await this.prisma.favoriteSong.delete({
                where: { id: existing.id },
            });
            this.logger.log(`取消收藏歌曲: userId=${userId}, songId=${songId}`);
            return { isFavorited: false };
        }

        await this.prisma.favoriteSong.create({
            data: { userId, songId: bSongId },
        });
        this.logger.log(`收藏歌曲: userId=${userId}, songId=${songId}`);
        return { isFavorited: true };
    }

    async isSongFavorited(userId: number, songId: number) {
        const existing = await this.prisma.favoriteSong.findUnique({
            where: { userId_songId: { userId, songId: BigInt(songId) } },
        });
        return { isFavorited: !!existing };
    }

    async getFavoriteAlbums(userId: number) {
        const favorites = await this.prisma.favoriteAlbum.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        const albumIds = favorites.map((f) => Number(f.albumId));
        const albumMap = new Map<number, any>();

        if (albumIds.length > 0) {
            const localAlbums = await this.prisma.album.findMany({
                where: { id: { in: albumIds } },
                include: {
                    artists: true,
                    _count: { select: { songs: true } },
                },
            });
            for (const a of localAlbums) {
                albumMap.set(a.id, a);
            }

            const missingIds = albumIds.filter((id) => !albumMap.has(id));
            if (missingIds.length > 0) {
                await Promise.all(
                    missingIds.map(async (id) => {
                        try {
                            const onlineAlbum = await this.onlineMusicService.findAlbumById(id);
                            if (onlineAlbum) {
                                albumMap.set(id, onlineAlbum);
                            }
                        } catch {
                            // ignore
                        }
                    }),
                );
            }
        }

        return favorites.map((f) => {
            const numId = Number(f.albumId);
            const album = albumMap.get(numId) || {
                id: numId,
                title: '未知专辑',
                artists: [],
            };
            return {
                ...album,
                id: numId,
                favoritedAt: f.createdAt,
            };
        });
    }

    async toggleFavoriteAlbum(userId: number, albumId: number) {
        const bAlbumId = BigInt(albumId);
        const existing = await this.prisma.favoriteAlbum.findUnique({
            where: { userId_albumId: { userId, albumId: bAlbumId } },
        });

        if (existing) {
            await this.prisma.favoriteAlbum.delete({
                where: { id: existing.id },
            });
            this.logger.log(`取消收藏专辑: userId=${userId}, albumId=${albumId}`);
            return { isFavorited: false };
        }

        await this.prisma.favoriteAlbum.create({
            data: { userId, albumId: bAlbumId },
        });
        this.logger.log(`收藏专辑: userId=${userId}, albumId=${albumId}`);
        return { isFavorited: true };
    }

    async getFollowedArtists(userId: number) {
        const follows = await this.prisma.followedArtist.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });

        const artistIds = follows.map((f) => Number(f.artistId));
        const artistMap = new Map<number, any>();

        if (artistIds.length > 0) {
            const localArtists = await this.prisma.artist.findMany({
                where: { id: { in: artistIds } },
                include: {
                    _count: { select: { albums: true } },
                },
            });
            for (const a of localArtists) {
                artistMap.set(a.id, a);
            }

            const missingIds = artistIds.filter((id) => !artistMap.has(id));
            if (missingIds.length > 0) {
                await Promise.all(
                    missingIds.map(async (id) => {
                        try {
                            const onlineArtist = await this.onlineMusicService.findArtistById(id);
                            if (onlineArtist) {
                                artistMap.set(id, onlineArtist);
                            }
                        } catch {
                            // ignore
                        }
                    }),
                );
            }
        }

        return follows.map((f) => {
            const numId = Number(f.artistId);
            const artist = artistMap.get(numId) || {
                id: numId,
                name: '未知艺术家',
            };
            return {
                ...artist,
                id: numId,
                followedAt: f.createdAt,
            };
        });
    }

    async toggleFollowArtist(userId: number, artistId: number) {
        const bArtistId = BigInt(artistId);
        const existing = await this.prisma.followedArtist.findUnique({
            where: { userId_artistId: { userId, artistId: bArtistId } },
        });

        if (existing) {
            await this.prisma.followedArtist.delete({
                where: { id: existing.id },
            });
            this.logger.log(`取消关注艺术家: userId=${userId}, artistId=${artistId}`);
            return { isFollowing: false };
        }

        await this.prisma.followedArtist.create({
            data: { userId, artistId: bArtistId },
        });
        this.logger.log(`关注艺术家: userId=${userId}, artistId=${artistId}`);
        return { isFollowing: true };
    }

    async getFavoriteIds(userId: number) {
        const [songs, albums, artists] = await Promise.all([
            this.prisma.favoriteSong.findMany({
                where: { userId },
                select: { songId: true },
            }),
            this.prisma.favoriteAlbum.findMany({
                where: { userId },
                select: { albumId: true },
            }),
            this.prisma.followedArtist.findMany({
                where: { userId },
                select: { artistId: true },
            }),
        ]);

        return {
            songIds: songs.map((s) => Number(s.songId)),
            albumIds: albums.map((a) => Number(a.albumId)),
            artistIds: artists.map((a) => Number(a.artistId)),
        };
    }
}
