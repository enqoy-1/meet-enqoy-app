import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin, UserRole.super_admin)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) { }

  @Get('enhanced')
  getEnhancedAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.analyticsService.getEnhancedAnalytics(start, end);
  }

  @Get('overview')
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('bookings')
  getBookingStats() {
    return this.analyticsService.getBookingStats();
  }

  @Get('events')
  getEventStats() {
    return this.analyticsService.getEventStats();
  }

  @Get('user-growth')
  getUserGrowth() {
    return this.analyticsService.getUserGrowth();
  }

  @Get('recent-activity')
  getRecentActivity() {
    return this.analyticsService.getRecentActivity();
  }
}

