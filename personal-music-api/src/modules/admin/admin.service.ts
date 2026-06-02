import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AdminService {
    constructor(private prisma: PrismaService) {}

    // Dashboard Stats
    async getStats() {
        const [userCount, artistCount, albumCount, songCount] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.artist.count(),
            this.prisma.album.count(),
            this.prisma.song.count(),
        ]);
        return { userCount, artistCount, albumCount, songCount };
    }

    // User Management
    async getUsers() {
        return this.prisma.user.findMany({
            select: {
                id: true,
                email: true,
                username: true,
                displayName: true,
                role: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async updateUserRole(userId: number, role: string) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { role },
        });
    }

    // Artist Management
    async getArtists() {
        return this.prisma.artist.findMany({
            include: {
                _count: {
                    select: { albums: true, followers: true }
                }
            },
            orderBy: { name: 'asc' },
        });
    }

    async updateArtist(id: number, data: any) {
        return this.prisma.artist.update({
            where: { id },
            data,
        });
    }

    async createArtist(data: any) {
        return this.prisma.artist.create({
            data,
        });
    }

    async deleteArtist(id: number) {
        return this.prisma.artist.delete({
            where: { id },
        });
    }

    // Album Management
    async getAlbums() {
        return this.prisma.album.findMany({
            include: {
                artists: { select: { name: true } },
                _count: { select: { songs: true } }
            },
            orderBy: { title: 'asc' },
        });
    }
}
