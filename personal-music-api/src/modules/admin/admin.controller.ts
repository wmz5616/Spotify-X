import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
    constructor(private adminService: AdminService) {}

    @Get('stats')
    async getStats() {
        return this.adminService.getStats();
    }

    // Users
    @Get('users')
    async getUsers() {
        return this.adminService.getUsers();
    }

    @Put('users/:id/role')
    async updateUserRole(@Param('id') id: string, @Body('role') role: string) {
        return this.adminService.updateUserRole(Number(id), role);
    }

    // Artists
    @Get('artists')
    async getArtists() {
        return this.adminService.getArtists();
    }

    @Post('artists')
    async createArtist(@Body() data: any) {
        return this.adminService.createArtist(data);
    }

    @Put('artists/:id')
    async updateArtist(@Param('id') id: string, @Body() data: any) {
        return this.adminService.updateArtist(Number(id), data);
    }

    @Delete('artists/:id')
    async deleteArtist(@Param('id') id: string) {
        return this.adminService.deleteArtist(Number(id));
    }

    // Albums
    @Get('albums')
    async getAlbums() {
        return this.adminService.getAlbums();
    }
}
