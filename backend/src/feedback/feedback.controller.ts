import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private feedbackService: FeedbackService) {}

  @Post()
  createFeedback(@CurrentUser() user: any, @Body() data: any) {
    return this.feedbackService.createFeedback(user.id, data);
  }

  @Get('my')
  getMyFeedback(@CurrentUser() user: any) {
    return this.feedbackService.getMyFeedback(user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  getAllFeedback() {
    return this.feedbackService.getAllFeedback();
  }

  @Get('event/:eventId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin, UserRole.super_admin)
  getFeedbackByEvent(@Param('eventId') eventId: string) {
    return this.feedbackService.getFeedbackByEvent(eventId);
  }
}
