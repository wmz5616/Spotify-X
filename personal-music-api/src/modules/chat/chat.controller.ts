import { Controller, Get, Post, Delete, Body, Param, UseGuards, Req, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as path from 'path';
import * as fs from 'fs';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  getConversations(@Req() req) {
    return this.chatService.getConversations(req.user.id);
  }

  @Get('messages/:id')
  getMessages(@Param('id') id: string) {
    return this.chatService.getMessages(parseInt(id));
  }

  @Post('friend/request')
  sendFriendRequest(@Req() req, @Body('friendId') friendId: number) {
    return this.chatService.sendFriendRequest(req.user.id, friendId);
  }

  @Post('friend/accept')
  acceptFriendRequest(@Req() req, @Body('friendId') friendId: number) {
    return this.chatService.acceptFriendRequest(req.user.id, friendId);
  }

  @Get('friends')
  getFriends(@Req() req) {
    return this.chatService.getFriends(req.user.id);
  }

  @Get('search/:username')
  searchUser(@Param('username') username: string, @Req() req: any) {
    return this.chatService.searchUserByUsername(username, req.user.id);
  }

  @Post('read/:conversationId')
  markAsRead(@Param('conversationId') conversationId: string, @Req() req: any) {
    return this.chatService.markAsRead(parseInt(conversationId), req.user.id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  async uploadFile(
    @Req() req,
    @UploadedFile() file: { originalname: string; buffer: Buffer },
  ) {
    const uploadDir = path.join(process.cwd(), 'public', 'chat');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${req.user.id}_${Date.now()}${path.extname(file.originalname)}`;
    const filePath = path.join(uploadDir, fileName);

    fs.writeFileSync(filePath, file.buffer);

    return {
      path: `/chat/${fileName}`,
    };
  }

  @Delete('conversation/:id/messages')
  deleteConversationMessages(@Param('id') id: string) {
    return this.chatService.deleteConversationMessages(parseInt(id));
  }
}
