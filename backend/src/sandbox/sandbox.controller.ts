import { Controller, Get, Post, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { SandboxService } from './sandbox.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('sandbox')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin, UserRole.super_admin)
export class SandboxController {
    constructor(private sandboxService: SandboxService) { }

    @Get('time')
    getTimeState() {
        return this.sandboxService.getTimeState();
    }

    @Post('time/freeze')
    freezeTime(@Body() body: { datetime: string }) {
        return this.sandboxService.freezeTime(new Date(body.datetime));
    }

    @Post('time/reset')
    resetTime() {
        return this.sandboxService.resetTime();
    }

    @Get('current-time')
    getSandboxTime() {
        return this.sandboxService.getSandboxTime();
    }

    @Post('seed')
    async seedData(
        @Body() body: { userCount?: number; eventCount?: number; eventDays?: number },
    ) {
        const userCount = body.userCount || 10;
        const eventCount = body.eventCount || 3;
        const eventDays = body.eventDays || 7;

        // Create users
        const users = await this.sandboxService.createSandboxUsers(userCount);

        // Create events
        const events = await this.sandboxService.createSandboxEvents(eventCount, eventDays);

        // Create bookings
        const userIds = users.map(u => u.id);
        const eventIds = events.map(e => e.id);
        const bookings = await this.sandboxService.createSandboxBookings(userIds, eventIds);

        return {
            users: users.length,
            events: events.length,
            bookings: bookings.length,
        };
    }

    @Delete('reset')
    resetSandboxData() {
        return this.sandboxService.resetSandboxData();
    }

    @Get('users')
    getSandboxUsers() {
        return this.sandboxService.getSandboxUsers();
    }

    @Get('events')
    getSandboxEvents() {
        return this.sandboxService.getSandboxEvents();
    }

    @Get('notifications')
    getSandboxNotifications(@Query('limit') limit?: string) {
        return this.sandboxService.getSandboxNotifications(limit ? parseInt(limit) : 50);
    }
}
