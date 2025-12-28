import { Controller, Get, Post, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { SettingsService, WelcomeBannerSettings } from './settings.service';
import { EmailService } from '../email/email.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('settings')
export class SettingsController {
    constructor(
        private readonly settingsService: SettingsService,
        private readonly emailService: EmailService,
    ) { }

    // Public - anyone can get the welcome banner
    @Get('welcome-banner')
    async getWelcomeBanner() {
        return this.settingsService.getWelcomeBanner();
    }

    // Admin only - update welcome banner
    @Patch('welcome-banner')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'super_admin')
    async updateWelcomeBanner(@Body() data: Partial<WelcomeBannerSettings>) {
        return this.settingsService.updateWelcomeBanner(data);
    }

    // Admin only - test email configuration
    @Post('test-email')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin', 'super_admin')
    async testEmail(@Query('to') to: string) {
        if (!to) {
            return { success: false, message: 'Please provide a "to" email address' };
        }
        return this.emailService.sendTestEmail(to);
    }
}
