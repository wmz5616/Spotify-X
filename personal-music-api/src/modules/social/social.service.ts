import { Injectable, NotFoundException, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OnlineMusicService } from '../music-library/online-music.service';
import { CreateFeedPostDto } from './dto/social.dto';

@Injectable()
export class SocialService {
    private readonly logger = new Logger(SocialService.name);

    constructor(
        private prisma: PrismaService,
        private onlineMusicService: OnlineMusicService,
    ) { }

    async follow(followerId: number, followingId: number) {
        if (followerId === followingId) {
            throw new ConflictException('你不能关注你自己');
        }

        const targetUser = await this.prisma.user.findUnique({ where: { id: followingId } });
        if (!targetUser) {
            throw new NotFoundException('目标用户不存在');
        }

        const existingFollow = await this.prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId,
                },
            },
        });

        if (existingFollow) {
            throw new ConflictException('你已经关注了该用户');
        }

        return this.prisma.follow.create({
            data: {
                followerId,
                followingId,
            },
        });
    }

    async unfollow(followerId: number, followingId: number) {
        const existingFollow = await this.prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId,
                },
            },
        });

        if (!existingFollow) {
            throw new NotFoundException('你没有关注该用户');
        }

        return this.prisma.follow.delete({
            where: {
                id: existingFollow.id,
            },
        });
    }

    async getFollowing(userId: number) {
        return this.prisma.follow.findMany({
            where: { followerId: userId },
            include: {
                following: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarPath: true,
                        bio: true,
                        ipLocation: true,
                    },
                },
            },
        });
    }

    async getFollowers(userId: number) {
        return this.prisma.follow.findMany({
            where: { followingId: userId },
            include: {
                follower: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarPath: true,
                        bio: true,
                        ipLocation: true,
                    },
                },
            },
        });
    }

    private async populateFeedPosts(posts: any[], currentUserId?: number) {
        const songIds = posts
            .filter(p => p.type === 'song' && p.targetId != null)
            .map(p => Number(p.targetId));

        let songMap = new Map();
        if (songIds.length > 0) {
            const songs = await this.prisma.song.findMany({
                where: { id: { in: songIds } },
                include: { album: { include: { artists: true } } }
            });
            songMap = new Map(songs.map(s => [s.id, s]));

            const missingIds = songIds.filter(id => !songMap.has(id));
            if (missingIds.length > 0) {
                await Promise.all(
                    missingIds.map(async (id) => {
                        try {
                            const onlineSong = await this.onlineMusicService.findSongById(id);
                            if (onlineSong) {
                                songMap.set(id, onlineSong);
                            }
                        } catch (e) {
                            // ignore if online fetch fails
                        }
                    })
                );
            }
        }

        return posts.map(post => {
            const result: any = { ...post };
            if (post.targetId != null) {
                result.targetId = Number(post.targetId);
            }
            if (post.images) {
                try { result.images = JSON.parse(post.images); } catch(e) { result.images = []; }
            } else {
                result.images = [];
            }
            if (post.type === 'song' && post.targetId != null) {
                result.song = songMap.get(Number(post.targetId));
            }
            if (currentUserId && post.likes) {
                result.isLiked = post.likes.some((l: any) => l.userId === currentUserId);
            }
            delete result.likes;
            return result;
        });
    }

    async createFeedPost(userId: number, dto: CreateFeedPostDto) {
        const post = await this.prisma.feedPost.create({
            data: {
                userId,
                content: dto.content,
                type: dto.type,
                targetId: dto.targetId !== undefined && dto.targetId !== null ? (BigInt(dto.targetId) as any) : null,
                images: dto.images && dto.images.length > 0 ? JSON.stringify(dto.images) : null,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarPath: true,
                        ipLocation: true,
                    },
                },
            },
        });
        const [populated] = await this.populateFeedPosts([post], userId);
        return populated;
    }

    async getUserFeed(userId: number, currentUserId?: number) {
        const posts = await this.prisma.feedPost.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarPath: true,
                        avatarPosition: true,
                    },
                },
                _count: { select: { likes: true, comments: true } },
                likes: currentUserId ? { where: { userId: currentUserId } } : undefined,
            },
        });
        return this.populateFeedPosts(posts, currentUserId);
    }

    async getGlobalFeed(currentUserId?: number) {
        const posts = await this.prisma.feedPost.findMany({
            take: 50,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarPath: true,
                        avatarPosition: true,
                    },
                },
                _count: { select: { likes: true, comments: true } },
                likes: currentUserId ? { where: { userId: currentUserId } } : undefined,
            },
        });
        return this.populateFeedPosts(posts, currentUserId);
    }

    async likePost(userId: number, postId: number) {
        const post = await this.prisma.feedPost.findUnique({ where: { id: postId } });
        if (!post) throw new NotFoundException('动态不存在');
        
        const existingLike = await this.prisma.feedPostLike.findUnique({
            where: { postId_userId: { postId, userId } }
        });

        if (existingLike) {
            // Toggle off: Unlike
            await this.prisma.feedPostLike.delete({ where: { id: existingLike.id } });
            return { liked: false };
        } else {
            // Toggle on: Like
            await this.prisma.feedPostLike.create({
                data: { userId, postId },
            });
            return { liked: true };
        }
    }

    async unlikePost(userId: number, postId: number) {
        const like = await this.prisma.feedPostLike.findUnique({
            where: { postId_userId: { postId, userId } }
        });
        if (!like) throw new NotFoundException('你还没有点赞该动态');
        
        return this.prisma.feedPostLike.delete({
            where: { id: like.id },
        });
    }

    async commentPost(userId: number, postId: number, content: string) {
        if (!content || content.trim().length === 0) throw new BadRequestException('评论内容不能为空');
        
        return this.prisma.feedPostComment.create({
            data: { userId, postId, content },
            include: {
                user: { select: { id: true, username: true, displayName: true, avatarPath: true, avatarPosition: true } }
            }
        });
    }

    async getComments(postId: number) {
        return this.prisma.feedPostComment.findMany({
            where: { postId },
            orderBy: { createdAt: 'asc' },
            include: {
                user: { select: { id: true, username: true, displayName: true, avatarPath: true, avatarPosition: true } }
            }
        });
    }

    async updateFeedPost(userId: number, postId: number, content: string) {
        const post = await this.prisma.feedPost.findUnique({ where: { id: postId } });
        if (!post) throw new NotFoundException('动态不存在');
        if (post.userId !== userId) throw new BadRequestException('无权修改他人动态');

        return this.prisma.feedPost.update({
            where: { id: postId },
            data: { content },
        });
    }

    async deleteFeedPost(userId: number, postId: number) {
        const post = await this.prisma.feedPost.findUnique({ where: { id: postId } });
        if (!post) throw new NotFoundException('动态不存在');
        if (post.userId !== userId) throw new BadRequestException('无权删除他人动态');

        // Delete associated likes and comments first (Prisma delete handles relations if configured, but let's be explicit or rely on onDelete: Cascade)
        // Note: Prisma schema shows @@unique([postId, userId]) and relations. If onDelete Cascade is not set, we need to handle it.
        return this.prisma.feedPost.delete({
            where: { id: postId },
        });
    }
}
