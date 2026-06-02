import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getConversations(userId: number) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: { id: userId },
        },
      },
      include: {
        participants: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarPath: true,
            avatarPosition: true,
            updatedAt: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: {
                isRead: false,
                senderId: { not: userId }
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map(c => ({
      ...c,
      unreadCount: (c as any)._count?.messages || 0
    }));
  }

  async updateLastActive(userId: number) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { updatedAt: new Date() }
      });
    } catch (e) {
      // ignore
    }
  }

  async markAsRead(conversationId: number, userId: number) {
    return this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false
      },
      data: { isRead: true }
    });
  }

  async getMessages(conversationId: number) {
    return this.prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarPath: true,
          },
        },
        song: {
          include: {
            album: {
              include: {
                artists: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(senderId: number, recipientId: number, content: string, type: string = "text", imagePath?: string, songId?: number) {
    // Find if a conversation already exists between these two
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { id: senderId } } },
          { participants: { some: { id: recipientId } } },
        ],
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          participants: {
            connect: [{ id: senderId }, { id: recipientId }],
          },
        },
      });
    }

    const message = await this.prisma.message.create({
      data: {
        content,
        senderId,
        conversationId: conversation.id,
        type,
        imagePath,
        songId,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarPath: true,
          },
        },
        song: {
          include: {
            album: {
              include: {
                artists: true
              }
            }
          }
        }
      },
    });

    // Update conversation's updatedAt
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async sendFriendRequest(userId: number, friendId: number) {
    if (userId === friendId) throw new Error('Cannot add yourself as friend');

    return this.prisma.friendship.upsert({
      where: {
        userId_friendId: {
          userId: Math.min(userId, friendId),
          friendId: Math.max(userId, friendId),
        },
      },
      update: { status: 'pending' },
      create: {
        userId: Math.min(userId, friendId),
        friendId: Math.max(userId, friendId),
        status: 'pending',
      },
    });
  }

  async acceptFriendRequest(userId: number, friendId: number) {
    return this.prisma.friendship.update({
      where: {
        userId_friendId: {
          userId: Math.min(userId, friendId),
          friendId: Math.max(userId, friendId),
        },
      },
      data: { status: 'accepted' },
    });
  }

  async getFriends(userId: number) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ userId }, { friendId: userId }],
        status: 'accepted',
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatarPath: true },
        },
        friend: {
          select: { id: true, username: true, displayName: true, avatarPath: true },
        },
      },
    });

    return friendships.map((f) => (f.userId === userId ? f.friend : f.user));
  }

  async searchUserByUsername(username: string, currentUserId: number) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarPath: true,
        bio: true,
      },
    });
    if (!user) return null;
    return {
      ...user,
      isMe: user.id === currentUserId
    };
  }

  async deleteConversationMessages(conversationId: number) {
    return this.prisma.message.deleteMany({
      where: { conversationId }
    });
  }
}
