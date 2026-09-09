import { Controller, Get, Put, Param, UseGuards, Request } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get()
    findAll(@Request() req) {
        const userId = req.user.id ?? req.user.userId;
        return this.notificationService.findAll(userId);
    }

    @Put(':id/read')
    markAsRead(@Param('id') id: string, @Request() req) {
        const userId = req.user.id ?? req.user.userId;
        return this.notificationService.markAsRead(id, userId);
    }

    @Put('read-all')
    markAllAsRead(@Request() req) {
        const userId = req.user.id ?? req.user.userId;
        return this.notificationService.markAllAsRead(userId);
    }
}
