import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common';
import { FriendInvitationsService } from './friend-invitations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('friend-invitations')
@UseGuards(JwtAuthGuard)
export class FriendInvitationsController {
  constructor(private friendInvitationsService: FriendInvitationsService) {}

  @Post('send')
  sendInvitation(
    @Request() req,
    @Body() body: { eventId: string; friendEmail: string; friendName?: string },
  ) {
    return this.friendInvitationsService.sendInvitation(
      req.user.userId,
      body.eventId,
      body.friendEmail,
      body.friendName,
    );
  }

  @Get('token/:token')
  getInvitationByToken(@Param('token') token: string) {
    return this.friendInvitationsService.getInvitationByToken(token);
  }

  @Post('accept/:token')
  acceptInvitation(@Param('token') token: string, @Request() req) {
    return this.friendInvitationsService.acceptInvitation(token, req.user.userId);
  }

  @Post('book-for-friend')
  bookForFriend(
    @Request() req,
    @Body()
    body: {
      eventId: string;
      friendData: { name: string; email: string; phone?: string };
    },
  ) {
    return this.friendInvitationsService.bookForFriend(
      req.user.userId,
      body.eventId,
      body.friendData,
    );
  }

  @Get('my')
  getMyInvitations(@Request() req) {
    return this.friendInvitationsService.getMyInvitations(req.user.userId);
  }
}
